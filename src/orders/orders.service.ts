import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MesaEstado } from '../common/enums/table-status.enum';
import { PedidoEstado } from '../common/enums/order-status.enum';
import { errorBody } from '../common/utils/error-response';
import { minutesAgo } from '../common/utils/time';
import { envNumber } from '../config/env';
import { StockService } from '../inventory/stock.service';
import { MenuService } from '../menu/menu.service';
import { MesasService } from '../tables/tables.service';
import { NotificacionesService } from '../notifications/notifications.service';
import { CreatePedidoDto } from './dto/create-order.dto';
import { DetallePedidoDto } from './dto/order-item.dto';
import { UpdateDetallesDto } from './dto/update-order-items.dto';
import { UpdateEstadoPedidoDto } from './dto/update-order-status.dto';
import { PedidoDetalle } from './entities/order-item.entity';
import { PedidoEstadoHistorial } from './entities/order-status-history.entity';
import { Pedido } from './entities/order.entity';
import { CocinaEventosGateway, NotificacionesGateway } from './orders.gateway';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidosRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle) private readonly detallesRepo: Repository<PedidoDetalle>,
    @InjectRepository(PedidoEstadoHistorial)
    private readonly historialRepo: Repository<PedidoEstadoHistorial>,
    private readonly dataSource: DataSource,
    private readonly mesasService: MesasService,
    private readonly menuService: MenuService,
    private readonly stockService: StockService,
    private readonly notificacionesService: NotificacionesService,
    private readonly cocinaGateway: CocinaEventosGateway,
    private readonly notificacionesGateway: NotificacionesGateway,
  ) {}

  async create(dto: CreatePedidoDto, meseroId: number) {
    const mesa = await this.mesasService.getMesa(dto.mesa_id);
    if (mesa.estado !== MesaEstado.OCUPADA || !mesa.openedAt) {
      throw new UnprocessableEntityException(errorBody('MESA_NO_ACTIVA', 'La mesa no esta activa, abre la mesa primero'));
    }

    const detalles = await this.buildDetalles(dto.detalles);
    const pedido = this.pedidosRepo.create({
      mesaId: dto.mesa_id,
      meseroId,
      estado: PedidoEstado.BORRADOR,
      detalles,
      historialEstados: [{ estado: PedidoEstado.BORRADOR } as PedidoEstadoHistorial],
    });

    return this.toResponse(await this.pedidosRepo.save(pedido));
  }

  async findById(id: number) {
    const pedido = await this.pedidosRepo.findOne({
      where: { id },
      relations: { detalles: { producto: true }, historialEstados: true, mesa: true, mesero: true },
    });
    if (!pedido) {
      throw new NotFoundException(errorBody('PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado'));
    }
    return pedido;
  }

  async updateDetalles(id: number, dto: UpdateDetallesDto) {
    const pedido = await this.findById(id);
    if (pedido.estado !== PedidoEstado.BORRADOR) {
      throw new ConflictException(errorBody('PEDIDO_NO_EDITABLE', 'Este pedido ya no puede editarse'));
    }

    const productos = await this.assertProductosDisponibles(dto.detalles.map((detalle) => detalle.producto_id));
    const productosById = new Map(productos.map((producto) => [producto.id, producto]));

    await this.detallesRepo.delete({ pedidoId: id });
    pedido.detalles = dto.detalles.map((detalleDto) =>
      this.detallesRepo.create({
        pedidoId: id,
        productoId: detalleDto.producto_id,
        producto: productosById.get(detalleDto.producto_id),
        cantidad: detalleDto.cantidad,
        notas: detalleDto.notas ?? null,
      }),
    );

    return this.toResponse(await this.pedidosRepo.save(pedido));
  }

  async enviar(id: number) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, {
        where: { id },
        relations: {
          detalles: { producto: { recipeIngredients: { ingrediente: true }, ingredientes: true } },
          historialEstados: true,
          mesa: true,
          mesero: true,
        },
      });
      if (!pedido) {
        throw new NotFoundException(errorBody('PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado'));
      }
      if (pedido.estado !== PedidoEstado.BORRADOR) {
        throw new ConflictException(errorBody('PEDIDO_YA_ENVIADO', 'Este pedido ya fue enviado a cocina'));
      }
      if (!pedido.detalles?.length) {
        throw new UnprocessableEntityException(errorBody('PEDIDO_SIN_ITEMS', 'No puedes enviar un pedido sin productos'));
      }

      await this.stockService.registrarSalidas(manager, this.buildConsumosStock(pedido));

      pedido.estado = PedidoEstado.PENDIENTE;
      pedido.sentAt = new Date();
      pedido.historialEstados.push(manager.create(PedidoEstadoHistorial, { estado: PedidoEstado.PENDIENTE }));
      return manager.save(pedido);
    });
    const response = this.toResponse(saved);
    this.cocinaGateway.emitPedidoCreado(response);
    return response;
  }

  async updateEstado(id: number, dto: UpdateEstadoPedidoDto) {
    const pedido = await this.findById(id);
    const validTransitions: Record<PedidoEstado, PedidoEstado[]> = {
      [PedidoEstado.BORRADOR]: [],
      [PedidoEstado.PENDIENTE]: [PedidoEstado.EN_PREPARACION],
      [PedidoEstado.EN_PREPARACION]: [PedidoEstado.LISTO],
      [PedidoEstado.LISTO]: [],
      [PedidoEstado.ENTREGADO]: [],
    };

    if (!validTransitions[pedido.estado].includes(dto.estado)) {
      throw new ConflictException(errorBody('TRANSICION_INVALIDA', 'Transicion de estado no permitida'));
    }

    pedido.estado = dto.estado;
    pedido.historialEstados.push(this.historialRepo.create({ estado: dto.estado }));
    const saved = await this.pedidosRepo.save(pedido);
    const response = this.toResponse(saved);
    this.cocinaGateway.emitPedidoEstado(response);

    if (dto.estado === PedidoEstado.EN_PREPARACION) {
      const payload = this.buildNotificacionEstadoPayload(saved, 'pedido.en_preparacion');
      this.notificacionesGateway.emitPedidoEstado(payload);
      await this.notificacionesService.createPedidoEnPreparacion(saved, true);
    }

    if (dto.estado === PedidoEstado.LISTO) {
      const payload = this.buildNotificacionEstadoPayload(saved, 'pedido.listo');
      this.notificacionesGateway.emitPedidoListo(payload);
      this.notificacionesGateway.emitPedidoEstado(payload);
      await this.notificacionesService.createPedidoListo(saved, true);
    }

    return response;
  }

  async confirmarEntrega(id: number) {
    const pedido = await this.findById(id);
    if (pedido.estado !== PedidoEstado.LISTO) {
      throw new ConflictException(errorBody('PEDIDO_NO_LISTO', 'Solo se puede confirmar entrega de pedidos listos'));
    }

    pedido.estado = PedidoEstado.ENTREGADO;
    pedido.deliveredAt = new Date();
    pedido.historialEstados.push(this.historialRepo.create({ estado: PedidoEstado.ENTREGADO }));
    const saved = await this.pedidosRepo.save(pedido);
    const response = this.toResponse(saved);
    this.cocinaGateway.emitPedidoEstado(response);
    return response;
  }

  async findCocina(estados: PedidoEstado[], meseroId?: number) {
    const pedidos = await this.pedidosRepo.find({
      where: { estado: In(estados), ...(meseroId ? { meseroId } : {}) },
      relations: { detalles: { producto: true }, historialEstados: true, mesa: true, mesero: true },
      order: { createdAt: 'ASC' },
    });
    return pedidos.map((pedido) => this.toKdsResponse(pedido));
  }

  async notificaciones(id: number) {
    await this.findById(id);
    return this.notificacionesService.findByPedido(id);
  }

  private async buildDetalles(detallesDto: DetallePedidoDto[]) {
    const productos = await this.assertProductosDisponibles(detallesDto.map((detalle) => detalle.producto_id));
    const productosById = new Map(productos.map((producto) => [producto.id, producto]));

    return detallesDto.map((detalle) =>
      this.detallesRepo.create({
        productoId: detalle.producto_id,
        producto: productosById.get(detalle.producto_id),
        cantidad: detalle.cantidad,
        notas: detalle.notas ?? null,
      }),
    );
  }

  private async assertProductosDisponibles(ids: number[]) {
    const productos = await this.menuService.findActiveByIds(ids);
    if (productos.length !== new Set(ids).size) {
      throw new UnprocessableEntityException(
        errorBody('PRODUCTO_NO_DISPONIBLE', 'Uno o mas productos no estan disponibles'),
      );
    }
    return productos;
  }

  private buildConsumosStock(pedido: Pedido) {
    const consumos = new Map<number, { cantidad: number; motivo: string; usuarioId: number | null }>();
    for (const detalle of pedido.detalles) {
      const recipeItems = detalle.producto?.recipeIngredients?.length
        ? detalle.producto.recipeIngredients.map((recipe) => ({
            ingredienteId: recipe.ingredienteId,
            cantidadIngrediente: Number(recipe.cantidadIngrediente),
          }))
        : detalle.producto?.ingredientes?.map((ingrediente) => ({
            ingredienteId: ingrediente.id,
            cantidadIngrediente: 1,
          })) ?? [];

      for (const recipe of recipeItems) {
        const cantidad = detalle.cantidad * recipe.cantidadIngrediente;
        const current = consumos.get(recipe.ingredienteId);
        consumos.set(recipe.ingredienteId, {
          cantidad: (current?.cantidad ?? 0) + cantidad,
          motivo: `Consumo por pedido ${pedido.id}`,
          usuarioId: pedido.meseroId,
        });
      }
    }
    return [...consumos.entries()].map(([ingredienteId, consumo]) => ({ ingredienteId, ...consumo }));
  }

  toResponse(pedido: Pedido) {
    return {
      id: pedido.id,
      mesa_id: pedido.mesaId,
      mesa_numero: pedido.mesa?.numero,
      mesero_id: pedido.meseroId,
      mesero_nombre: pedido.mesero?.nombre,
      estado: pedido.estado,
      sent_at: pedido.sentAt,
      delivered_at: pedido.deliveredAt,
      detalles: pedido.detalles?.map((detalle) => ({
        id: detalle.id,
        producto_id: detalle.productoId,
        producto_nombre: detalle.producto?.nombre,
        categoria: detalle.producto?.categoria,
        precio: detalle.producto?.precio ? Number(detalle.producto.precio) : null,
        tiempo_preparacion: detalle.producto?.tiempoPreparacion
          ? this.normalizePreparationMinutes(detalle.producto.tiempoPreparacion)
          : null,
        cantidad: detalle.cantidad,
        notas: detalle.notas,
      })) ?? [],
      historial_estados: pedido.historialEstados?.map((historial) => ({
        estado: historial.estado,
        changed_at: historial.changedAt,
      })) ?? [],
      created_at: pedido.createdAt,
      updated_at: pedido.updatedAt,
    };
  }

  toKdsResponse(pedido: Pedido) {
    const staleMinutes = envNumber('KDS_STALE_MINUTES', 15);
    const antiguedad = minutesAgo(pedido.sentAt ?? pedido.createdAt) ?? 0;
    return {
      ...this.toResponse(pedido),
      hace_minutos: antiguedad,
      resaltar_por_antiguedad: antiguedad >= staleMinutes,
    };
  }

  private buildNotificacionEstadoPayload(pedido: Pedido, evento: string) {
    return {
      evento,
      pedido_id: pedido.id,
      mesa_id: pedido.mesaId,
      mesa_numero: pedido.mesa?.numero,
      mesero_id: pedido.meseroId,
      estado: pedido.estado,
      items: pedido.detalles.map((detalle) => ({
        producto_id: detalle.productoId,
        nombre: detalle.producto?.nombre,
        cantidad: detalle.cantidad,
        tiempo_preparacion: detalle.producto?.tiempoPreparacion
          ? this.normalizePreparationMinutes(detalle.producto.tiempoPreparacion)
          : null,
      })),
      mensaje:
        pedido.estado === PedidoEstado.LISTO
          ? `Pedido de Mesa ${pedido.mesa?.numero ?? pedido.mesaId} esta listo para entregar!`
          : `Pedido de Mesa ${pedido.mesa?.numero ?? pedido.mesaId} esta en preparacion`,
    };
  }

  private normalizePreparationMinutes(value: number) {
    if (value > 180 && value % 60 === 0) {
      return value / 60;
    }
    return value;
  }
}
