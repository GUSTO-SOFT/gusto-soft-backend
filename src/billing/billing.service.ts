import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, MoreThanOrEqual, Repository } from 'typeorm';
import { PedidoEstado } from '../common/enums/order-status.enum';
import { MesaEstado } from '../common/enums/table-status.enum';
import { errorBody } from '../common/utils/error-response';
import { envString } from '../config/env';
import { Pedido } from '../orders/entities/order.entity';
import { Mesa } from '../tables/entities/restaurant-table.entity';
import { MesasGateway } from '../tables/tables.gateway';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CloseAccountDto } from './dto/close-account.dto';
import { SendInvoiceEmailDto } from './dto/send-invoice-email.dto';
import { Cuenta } from './entities/account.entity';
import { AuditoriaFacturacion } from './entities/billing-audit.entity';
import { FacturaEnvio } from './entities/invoice-email.entity';
import { FacturaElectronica } from './entities/invoice.entity';
import { CuentaEstado, DescuentoTipo, FacturaEnvioEstado, FacturaEstado } from './enums/billing.enum';

type CuentaDocumento = {
  mesa_id: number;
  pedido_ids: number[];
  items: Array<{
    producto_id: number;
    producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  impuestos: number;
  total_bruto: number;
};

@Injectable()
export class FacturacionService {
  private readonly taxRate = 0.19;
  private readonly retryTimers = new Map<number, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Cuenta) private readonly cuentasRepo: Repository<Cuenta>,
    @InjectRepository(FacturaElectronica) private readonly facturasRepo: Repository<FacturaElectronica>,
    @InjectRepository(FacturaEnvio) private readonly enviosRepo: Repository<FacturaEnvio>,
    private readonly dataSource: DataSource,
    private readonly mesasGateway: MesasGateway,
  ) {}

  async cuentaMesa(mesaId: number) {
    return this.dataSource.transaction(async (manager) => {
      const cuenta = await this.persistCuentaFromMesa(manager, mesaId);
      return this.toCuentaResponse(cuenta);
    });
  }

  async aplicarDescuento(id: number, dto: ApplyDiscountDto, usuarioId: number) {
    if (!dto.motivo?.trim()) {
      throw new BadRequestException(errorBody('MOTIVO_REQUERIDO', 'El motivo es obligatorio'));
    }

    return this.dataSource.transaction(async (manager) => {
      const cuenta = await this.resolveCuentaForMutation(manager, id);
      const totalBruto = Number(cuenta.totalBruto);

      const descuento = this.calculateDiscount(dto, totalBruto);
      cuenta.descuento = descuento.toFixed(2);
      cuenta.descuentoTipo = dto.tipo;
      cuenta.descuentoMotivo = dto.motivo.trim();
      cuenta.descuentoUsuarioId = usuarioId;
      cuenta.totalNeto = (totalBruto - descuento).toFixed(2);

      return this.toCuentaResponse(await manager.save(cuenta));
    });
  }

  async cerrarCuenta(id: number, cajeroId: number, dto: CloseAccountDto = {}) {
    const result = await this.dataSource.transaction(async (manager) => {
      const resolved = await this.resolveCuentaForMutation(manager, id);
      if (resolved.estado === CuentaEstado.CERRADA) {
        throw new ConflictException(errorBody('CUENTA_YA_CERRADA', 'La cuenta ya esta cerrada'));
      }

      const mesa = await manager.findOne(Mesa, {
        where: { id: resolved.mesaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mesa) {
        throw new NotFoundException(errorBody('MESA_NO_ENCONTRADA', 'Mesa no encontrada'));
      }

      const closedAt = new Date();
      const totalNeto = Number(resolved.totalNeto);
      if (dto.monto_recibido !== undefined && dto.monto_recibido < totalNeto) {
        throw new UnprocessableEntityException(
          errorBody('PAGO_INSUFICIENTE', 'El monto recibido no cubre el total neto'),
        );
      }

      mesa.estado = MesaEstado.DISPONIBLE;
      mesa.openedAt = null;
      mesa.meseroId = null;
      await manager.save(mesa);

      const pedidoIds = this.extractCuentaPedidoIds(resolved);
      if (pedidoIds.length) {
        await manager.update(Pedido, { id: In(pedidoIds) }, { estado: PedidoEstado.ENTREGADO, deliveredAt: closedAt });
      }

      resolved.estado = CuentaEstado.CERRADA;
      resolved.closedAt = closedAt;
      resolved.cajeroId = cajeroId;
      resolved.metodoPago = dto.metodo_pago?.trim() || null;
      resolved.montoRecibido = dto.monto_recibido !== undefined ? dto.monto_recibido.toFixed(2) : null;
      resolved.cambio =
        dto.monto_recibido !== undefined ? Math.max(dto.monto_recibido - totalNeto, 0).toFixed(2) : null;
      const saved = await manager.save(resolved);

      await manager.save(
        manager.create(AuditoriaFacturacion, {
          cuentaId: saved.id,
          cajeroId,
          totalNeto: saved.totalNeto,
          descuento: saved.descuento,
          closedAt,
        }),
      );

      return { cuenta: saved, mesa };
    });

    this.mesasGateway.emitEstado({
      mesa_id: result.mesa.id,
      estado: result.mesa.estado,
      estado_color: 'verde',
      mesero_id: result.mesa.meseroId,
      opened_at: result.mesa.openedAt,
    });

    const factura = await this.generarYTransmitirFactura(result.cuenta);
    return {
      ...this.toCuentaResponse(result.cuenta),
      factura: this.toFacturaEstadoResponse(factura),
    };
  }

  async estadoFactura(id: number) {
    const factura = await this.facturasRepo.findOne({ where: { id } });
    if (!factura) {
      throw new NotFoundException(errorBody('FACTURA_NO_ENCONTRADA', 'Factura no encontrada'));
    }
    return this.toFacturaEstadoResponse(factura);
  }

  async enviarFacturaCorreo(id: number, dto: SendInvoiceEmailDto) {
    if (!this.isValidEmail(dto.email)) {
      throw new BadRequestException(errorBody('EMAIL_INVALIDO', 'El email no cumple el formato requerido'));
    }

    const factura = await this.facturasRepo.findOne({ where: { id } });
    if (!factura) {
      throw new NotFoundException(errorBody('FACTURA_NO_ENCONTRADA', 'Factura no encontrada'));
    }

    this.buildFacturaPdf(factura);
    const envio = await this.enviosRepo.save(
      this.enviosRepo.create({
        facturaId: factura.id,
        emailDestino: dto.email,
        estado: FacturaEnvioEstado.ENVIADO,
        detalleError: null,
      }),
    );
    return this.toEnvioResponse(envio);
  }

  async enviosFactura(id: number) {
    const factura = await this.facturasRepo.findOne({ where: { id } });
    if (!factura) {
      throw new NotFoundException(errorBody('FACTURA_NO_ENCONTRADA', 'Factura no encontrada'));
    }
    const envios = await this.enviosRepo.find({ where: { facturaId: id }, order: { sentAt: 'DESC' } });
    return envios.map((envio) => this.toEnvioResponse(envio));
  }

  private async resolveCuentaForMutation(manager: EntityManager, id: number) {
    const cuenta = await manager.findOne(Cuenta, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (cuenta) {
      if (cuenta.estado === CuentaEstado.CERRADA) {
        throw new ConflictException(errorBody('CUENTA_YA_CERRADA', 'La cuenta ya esta cerrada'));
      }
      return cuenta;
    }
    return this.persistCuentaFromMesa(manager, id);
  }

  private async persistCuentaFromMesa(manager: EntityManager, mesaId: number) {
    const documento = await this.buildCuentaDocumento(mesaId, manager);
    const existing = await manager.findOne(Cuenta, {
      where: { mesaId, estado: CuentaEstado.ABIERTA },
      order: { id: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    const cuenta = existing ?? manager.create(Cuenta, { mesaId, estado: CuentaEstado.ABIERTA });
    cuenta.items = documento.items;
    cuenta.impuestos = documento.impuestos.toFixed(2);
    cuenta.totalBruto = documento.total_bruto.toFixed(2);
    cuenta.totalNeto = (documento.total_bruto - Number(cuenta.descuento ?? 0)).toFixed(2);
    cuenta.metadata = { pedido_ids: documento.pedido_ids };

    return manager.save(cuenta);
  }

  private async buildCuentaDocumento(mesaId: number, manager: EntityManager = this.dataSource.manager): Promise<CuentaDocumento> {
    const mesa = await manager.findOne(Mesa, { where: { id: mesaId } });
    if (!mesa) {
      throw new NotFoundException(errorBody('MESA_NO_ENCONTRADA', 'Mesa no encontrada'));
    }
    if (mesa.estado !== MesaEstado.OCUPADA || !mesa.openedAt) {
      throw new UnprocessableEntityException(errorBody('CUENTA_SIN_ITEMS', 'La mesa no tiene una cuenta abierta'));
    }

    const pedidos = await manager.find(Pedido, {
      where: {
        mesaId,
        estado: In([PedidoEstado.PENDIENTE, PedidoEstado.EN_PREPARACION, PedidoEstado.LISTO, PedidoEstado.ENTREGADO]),
        ...(mesa.openedAt ? { sentAt: MoreThanOrEqual(mesa.openedAt) } : {}),
      },
      relations: ['detalles', 'detalles.producto'],
      order: { sentAt: 'ASC' },
    });
    const detalles = pedidos.flatMap((pedido) => pedido.detalles ?? []);
    if (!detalles.length) {
      throw new UnprocessableEntityException(errorBody('CUENTA_SIN_ITEMS', 'La mesa no tiene pedidos entregados'));
    }

    const byProduct = new Map<
      number,
      { producto_id: number; producto: string; cantidad: number; precio_unitario: number; subtotal: number }
    >();
    for (const detalle of detalles) {
      const precio = Number(detalle.producto.precio);
      const current = byProduct.get(detalle.productoId);
      if (current) {
        current.cantidad += detalle.cantidad;
        current.subtotal = Number((current.subtotal + detalle.cantidad * precio).toFixed(2));
      } else {
        byProduct.set(detalle.productoId, {
          producto_id: detalle.productoId,
          producto: detalle.producto.nombre,
          cantidad: detalle.cantidad,
          precio_unitario: precio,
          subtotal: Number((detalle.cantidad * precio).toFixed(2)),
        });
      }
    }

    const subtotal = [...byProduct.values()].reduce((sum, item) => sum + item.subtotal, 0);
    const impuestos = Number((subtotal * this.taxRate).toFixed(2));
    return {
      mesa_id: mesaId,
      pedido_ids: pedidos.map((pedido) => pedido.id),
      items: [...byProduct.values()],
      impuestos,
      total_bruto: Number((subtotal + impuestos).toFixed(2)),
    };
  }

  private extractCuentaPedidoIds(cuenta: Cuenta) {
    const metadata = cuenta.metadata as { pedido_ids?: unknown } | null;
    if (!Array.isArray(metadata?.pedido_ids)) {
      return [];
    }

    return metadata.pedido_ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  private calculateDiscount(dto: ApplyDiscountDto, totalBruto: number) {
    if (dto.tipo === DescuentoTipo.PORCENTAJE) {
      if (dto.valor <= 0 || dto.valor > 100) {
        throw new UnprocessableEntityException(
          errorBody('DESCUENTO_INVALIDO', 'El descuento porcentual debe estar entre 0 y 100'),
        );
      }
      return Number(((totalBruto * dto.valor) / 100).toFixed(2));
    }

    if (dto.valor > totalBruto) {
      throw new UnprocessableEntityException(
        errorBody('DESCUENTO_MAYOR_QUE_TOTAL', 'El descuento no puede superar el total bruto'),
      );
    }
    return Number(dto.valor.toFixed(2));
  }

  private async generarYTransmitirFactura(cuenta: Cuenta) {
    const documento = {
      tipo: 'FACTURA_ELECTRONICA',
      normativa: 'DIAN',
      cuenta_id: cuenta.id,
      mesa_id: cuenta.mesaId,
      items: cuenta.items,
      impuestos: Number(cuenta.impuestos),
      total_bruto: Number(cuenta.totalBruto),
      descuento: Number(cuenta.descuento),
      total_neto: Number(cuenta.totalNeto),
      metodo_pago: cuenta.metodoPago,
      monto_recibido: cuenta.montoRecibido ? Number(cuenta.montoRecibido) : null,
      cambio: cuenta.cambio ? Number(cuenta.cambio) : null,
      closed_at: cuenta.closedAt,
      cajero_id: cuenta.cajeroId,
    };

    const providerUrl = envString('FACTURA_PROVIDER_URL', '');
    if (!providerUrl) {
      const factura = await this.facturasRepo.save(
        this.facturasRepo.create({
          cuentaId: cuenta.id,
          documento,
          cufe: `CUFE-${cuenta.id}-${Date.now()}`,
          estado: FacturaEstado.ACEPTADA,
          respuestaProveedor: { estado: FacturaEstado.ACEPTADA, modo: 'simulado' },
          errorBody: null,
          intentos: 1,
          nextRetryAt: null,
        }),
      );
      return factura;
    }

    try {
      const response = await this.postProveedorFactura(providerUrl, documento);
      const estado = response.estado === FacturaEstado.RECHAZADA ? FacturaEstado.RECHAZADA : FacturaEstado.ACEPTADA;
      return this.facturasRepo.save(
        this.facturasRepo.create({
          cuentaId: cuenta.id,
          documento,
          cufe: typeof response.cufe === 'string' ? response.cufe : null,
          estado,
          respuestaProveedor: response,
          errorBody: estado === FacturaEstado.RECHAZADA ? JSON.stringify(response) : null,
          intentos: 1,
          nextRetryAt: null,
        }),
      );
    } catch (error) {
      const factura = await this.facturasRepo.save(
        this.facturasRepo.create({
          cuentaId: cuenta.id,
          documento,
          cufe: null,
          estado: FacturaEstado.PENDIENTE_REINTENTO,
          respuestaProveedor: null,
          errorBody: error instanceof Error ? error.message : String(error),
          intentos: 1,
          nextRetryAt: new Date(Date.now() + 60_000),
        }),
      );
      this.scheduleFacturaRetry(factura.id, factura.intentos);
      return factura;
    }
  }

  private async postProveedorFactura(url: string, documento: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documento),
        signal: controller.signal,
      });
      return (await response.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private scheduleFacturaRetry(facturaId: number, intentos: number) {
    if (intentos >= 3 || this.retryTimers.has(facturaId)) {
      return;
    }

    const delayMs = 60_000 * 2 ** Math.max(intentos - 1, 0);
    const timer = setTimeout(() => {
      this.retryTimers.delete(facturaId);
      void this.retryFactura(facturaId);
    }, delayMs);
    this.retryTimers.set(facturaId, timer);
  }

  private async retryFactura(facturaId: number) {
    const providerUrl = envString('FACTURA_PROVIDER_URL', '');
    if (!providerUrl) {
      return;
    }

    const factura = await this.facturasRepo.findOne({ where: { id: facturaId } });
    if (!factura || factura.estado !== FacturaEstado.PENDIENTE_REINTENTO || factura.intentos >= 3) {
      return;
    }

    try {
      const response = await this.postProveedorFactura(providerUrl, factura.documento);
      factura.estado = response.estado === FacturaEstado.RECHAZADA ? FacturaEstado.RECHAZADA : FacturaEstado.ACEPTADA;
      factura.cufe = typeof response.cufe === 'string' ? response.cufe : null;
      factura.respuestaProveedor = response;
      factura.errorBody = factura.estado === FacturaEstado.RECHAZADA ? JSON.stringify(response) : null;
      factura.intentos += 1;
      factura.nextRetryAt = null;
      await this.facturasRepo.save(factura);
    } catch (error) {
      factura.intentos += 1;
      factura.errorBody = error instanceof Error ? error.message : String(error);
      factura.nextRetryAt = factura.intentos < 3 ? new Date(Date.now() + 60_000 * 2 ** (factura.intentos - 1)) : null;
      await this.facturasRepo.save(factura);
      this.scheduleFacturaRetry(factura.id, factura.intentos);
    }
  }

  private buildFacturaPdf(factura: FacturaElectronica) {
    return Buffer.from(`Factura ${factura.id}\n${JSON.stringify(factura.documento, null, 2)}`, 'utf8');
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private toCuentaResponse(cuenta: Cuenta) {
    return {
      id: cuenta.id,
      mesa_id: cuenta.mesaId,
      estado: cuenta.estado,
      items: cuenta.items,
      impuestos: Number(cuenta.impuestos),
      total_bruto: Number(cuenta.totalBruto),
      descuento: Number(cuenta.descuento),
      descuento_tipo: cuenta.descuentoTipo,
      descuento_motivo: cuenta.descuentoMotivo,
      total_neto: Number(cuenta.totalNeto),
      closed_at: cuenta.closedAt,
      cajero_id: cuenta.cajeroId,
    };
  }

  private toFacturaEstadoResponse(factura: FacturaElectronica) {
    return {
      id: factura.id,
      cuenta_id: factura.cuentaId,
      cufe: factura.cufe,
      estado: factura.estado,
      timestamp_utc: factura.timestampUtc,
      error_body: factura.errorBody,
      intentos: factura.intentos,
      next_retry_at: factura.nextRetryAt,
    };
  }

  private toEnvioResponse(envio: FacturaEnvio) {
    return {
      id: envio.id,
      factura_id: envio.facturaId,
      email_destino: envio.emailDestino,
      estado: envio.estado,
      detalle_error: envio.detalleError,
      sent_at: envio.sentAt,
    };
  }
}
