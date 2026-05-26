import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidoEstado } from '../common/enums/order-status.enum';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { errorBody } from '../common/utils/error-response';
import { MovimientoStock } from '../inventory/entities/stock-movement.entity';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { PedidoDetalle } from '../orders/entities/order-item.entity';
import { SystemParameter } from './entities/system-parameter.entity';
import { QueryDateRangeDto, QueryWasteReportDto } from './dto/query-report-date-range.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(PedidoDetalle) private readonly detallesRepo: Repository<PedidoDetalle>,
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
      .addSelect('SUM(detalle.quantity * recipe.quantity_ingredient)', 'consumo_teorico')
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
      .addSelect('SUM(movimiento.cantidad)', 'consumo_real')
      .where('movimiento.tipo = :tipo', { tipo: StockMovementType.SALIDA })
      .andWhere('movimiento.fecha_utc BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
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
}
