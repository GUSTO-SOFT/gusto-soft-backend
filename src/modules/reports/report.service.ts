import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PedidoEstado } from '../../common/enums/order-status.enum';
import { StockMovementType } from '../../common/enums/stock-movement-type.enum';
import { errorBody } from '../../common/utils/error-response';
import { MovimientoStock } from '../inventory/entities/stock-movement.entity';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { PedidoDetalle } from '../orders/entities/order-item.entity';
import { Pedido } from '../orders/entities/order.entity';
import { SystemParameter } from './entities/system-parameter.entity';
import { QueryAfluenciaDto, QueryDateRangeDto, QueryWasteReportDto } from './dto/query-report-date-range.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(PedidoDetalle) private readonly detallesRepo: Repository<PedidoDetalle>,
    @InjectRepository(Pedido) private readonly pedidosRepo: Repository<Pedido>,
    @InjectRepository(ProductRecipeIngredient) private readonly recipeRepo: Repository<ProductRecipeIngredient>,
    @InjectRepository(MovimientoStock) private readonly movimientosRepo: Repository<MovimientoStock>,
    @InjectRepository(SystemParameter) private readonly parametrosRepo: Repository<SystemParameter>,
  ) {}

  async productosVendidos(query: QueryDateRangeDto) {
    const { dateFrom, dateTo } = this.resolveRange(query);
    const rows = await this.detallesRepo
      .createQueryBuilder('detalle')
      .innerJoin('detalle.pedido', 'pedido')
      .innerJoin('detalle.producto', 'producto')
      .select('producto.id', 'producto_id')
      .addSelect('producto.name', 'nombre')
      .addSelect('SUM(detalle.quantity)', 'total_unidades')
      .addSelect('SUM(detalle.quantity * producto.price)', 'ingreso_total')
      .where('pedido.status = :estado', { estado: PedidoEstado.ENTREGADO })
      .andWhere('pedido.delivered_at BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('producto.id')
      .addGroupBy('producto.name')
      .orderBy('total_unidades', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      producto_id: Number(row.producto_id),
      nombre: row.nombre,
      total_unidades: Number(row.total_unidades),
      ingreso_total: Number(row.ingreso_total),
    }));
  }

  async desperdicio(query: QueryWasteReportDto) {
    const { dateFrom, dateTo } = this.resolveRange(query);
    const umbral = await this.getUmbralDesperdicio();
    const teoricos = await this.recipeRepo
      .createQueryBuilder('recipe')
      .innerJoin('recipe.producto', 'producto')
      .innerJoin('producto.detalles', 'detalle')
      .innerJoin('detalle.pedido', 'pedido')
      .innerJoin('recipe.ingrediente', 'ingrediente')
      .select('ingrediente.id', 'ingrediente_id')
      .addSelect('ingrediente.name', 'nombre')
      .addSelect('SUM(detalle.quantity * recipe.ingredient_quantity)', 'consumo_teorico')
      .where('pedido.status = :estado', { estado: PedidoEstado.ENTREGADO })
      .andWhere('pedido.delivered_at BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .andWhere(query.ingrediente_id ? 'ingrediente.id = :ingredienteId' : '1=1', {
        ingredienteId: query.ingrediente_id,
      })
      .groupBy('ingrediente.id')
      .addGroupBy('ingrediente.name')
      .getRawMany();

    const reales = await this.movimientosRepo
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.ingrediente', 'ingrediente')
      .select('ingrediente.id', 'ingrediente_id')
      .addSelect('ingrediente.name', 'nombre')
      .addSelect('SUM(movimiento.quantity)', 'consumo_real')
      .where('movimiento.type = :tipo', { tipo: StockMovementType.SALIDA })
      .andWhere('movimiento.timestamp_utc BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .andWhere(query.ingrediente_id ? 'ingrediente.id = :ingredienteId' : '1=1', {
        ingredienteId: query.ingrediente_id,
      })
      .groupBy('ingrediente.id')
      .addGroupBy('ingrediente.name')
      .getRawMany();

    const byIngrediente = new Map<number, { ingrediente_id: number; nombre: string; teorico: number; real: number }>();
    for (const row of teoricos) {
      byIngrediente.set(Number(row.ingrediente_id), {
        ingrediente_id: Number(row.ingrediente_id),
        nombre: row.nombre,
        teorico: Number(row.consumo_teorico),
        real: 0,
      });
    }
    for (const row of reales) {
      const ingredienteId = Number(row.ingrediente_id);
      const current = byIngrediente.get(ingredienteId);
      byIngrediente.set(ingredienteId, {
        ingrediente_id: ingredienteId,
        nombre: current?.nombre ?? row.nombre,
        teorico: current?.teorico ?? 0,
        real: Number(row.consumo_real),
      });
    }

    return [...byIngrediente.values()].map((item) => {
      const diferencia = item.real - item.teorico;
      const porcentaje = item.teorico > 0 ? (diferencia / item.teorico) * 100 : item.real > 0 ? 100 : 0;
      return {
        ingrediente_id: item.ingrediente_id,
        nombre: item.nombre,
        consumo_teorico: Number(item.teorico.toFixed(3)),
        consumo_real: Number(item.real.toFixed(3)),
        diferencia: Number(diferencia.toFixed(3)),
        porcentaje_desperdicio: Number(porcentaje.toFixed(2)),
        alerta: porcentaje > umbral,
      };
    });
  }

  async afluencia(query: QueryAfluenciaDto) {
    const granularidad = query.granularidad ?? '1h';
    if (!['30m', '1h'].includes(granularidad)) {
      throw new BadRequestException(errorBody('GRANULARIDAD_INVALIDA', 'granularidad debe ser 30m o 1h'));
    }

    const { dateFrom, dateTo } = this.resolveRange(query);
    const bucketMinutes = granularidad === '30m' ? 30 : 60;
    const pedidos = await this.pedidosRepo.find({
      where: { createdAt: Between(dateFrom, dateTo) },
      order: { createdAt: 'ASC' },
    });

    const buckets = this.buildBuckets(dateFrom, dateTo, bucketMinutes, query.dia_semana);
    for (const pedido of pedidos) {
      const pedidoDate = pedido.createdAt;
      if (query.dia_semana !== undefined && pedidoDate.getUTCDay() !== query.dia_semana) {
        continue;
      }
      const bucket = this.findBucket(buckets, pedidoDate);
      if (bucket) {
        bucket.total_pedidos += 1;
        bucket.mesas.add(pedido.mesaId);
      }
    }

    const totals = buckets.map((bucket) => bucket.total_pedidos).sort((a, b) => a - b);
    const percentil75 = totals.length ? totals[Math.max(Math.ceil(totals.length * 0.75) - 1, 0)] : 0;
    const rows = buckets.map((bucket) => ({
      franja_inicio: bucket.start,
      franja_fin: bucket.end,
      total_pedidos: bucket.total_pedidos,
      total_mesas_abiertas: bucket.mesas.size,
      is_pico: bucket.total_pedidos > percentil75,
    }));
    const franjaPicoAbsoluto = rows.reduce<(typeof rows)[number] | null>(
      (current, row) => (!current || row.total_pedidos > current.total_pedidos ? row : current),
      null,
    );

    return {
      data: rows,
      resumen: {
        percentil_75: percentil75,
        franja_pico_absoluto: franjaPicoAbsoluto
          ? {
              franja_inicio: franjaPicoAbsoluto.franja_inicio,
              franja_fin: franjaPicoAbsoluto.franja_fin,
              total_pedidos: franjaPicoAbsoluto.total_pedidos,
              total_mesas_abiertas: franjaPicoAbsoluto.total_mesas_abiertas,
            }
          : null,
      },
    };
  }

  private resolveRange(query: QueryDateRangeDto) {
    const dateTo = query.date_to ?? new Date();
    const dateFrom = query.date_from ?? new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateFrom > dateTo) {
      throw new BadRequestException(errorBody('RANGO_FECHAS_INVALIDO', 'date_from no puede ser mayor a date_to'));
    }
    return { dateFrom, dateTo };
  }

  private async getUmbralDesperdicio() {
    const parametro = await this.parametrosRepo.findOne({ where: { clave: 'UMBRAL_DESPERDICIO_PORCENTAJE' } });
    return parametro ? Number(parametro.valor) : 10;
  }

  private buildBuckets(dateFrom: Date, dateTo: Date, bucketMinutes: number, diaSemana?: number) {
    const buckets: Array<{ start: Date; end: Date; total_pedidos: number; mesas: Set<number> }> = [];
    const stepMs = bucketMinutes * 60 * 1000;
    let cursor = new Date(Math.floor(dateFrom.getTime() / stepMs) * stepMs);

    while (cursor < dateTo) {
      const end = new Date(cursor.getTime() + stepMs);
      if (diaSemana === undefined || cursor.getUTCDay() === diaSemana) {
        buckets.push({
          start: new Date(cursor),
          end,
          total_pedidos: 0,
          mesas: new Set<number>(),
        });
      }
      cursor = end;
    }
    return buckets;
  }

  private findBucket(
    buckets: Array<{ start: Date; end: Date; total_pedidos: number; mesas: Set<number> }>,
    value: Date,
  ) {
    return buckets.find((bucket) => bucket.start <= value && value < bucket.end);
  }
}
