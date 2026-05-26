import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { errorBody } from '../common/utils/error-response';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Ingrediente } from './entities/ingredient.entity';
import { MovimientoStock } from './entities/stock-movement.entity';

type StockSalida = {
  ingredienteId: number;
  cantidad: number;
  motivo: string;
  usuarioId?: number | null;
};

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Ingrediente) private readonly ingredientesRepo: Repository<Ingrediente>,
    @InjectRepository(MovimientoStock) private readonly movimientosRepo: Repository<MovimientoStock>,
  ) {}

  async ajustarStock(ingredienteId: number, dto: AdjustStockDto, usuarioId: number) {
    const result = await this.ingredientesRepo.manager.transaction(async (manager) => {
      const ingrediente = await this.findIngredienteForUpdate(manager, ingredienteId);
      const nuevoStock = Number(ingrediente.stockActual) + dto.delta;
      if (nuevoStock < 0) {
        throw new UnprocessableEntityException(
          errorBody('STOCK_INSUFICIENTE', 'El ajuste deja el stock por debajo de cero'),
        );
      }

      ingrediente.stockActual = nuevoStock.toFixed(3);
      await manager.save(ingrediente);
      const movimiento = await manager.save(
        manager.create(MovimientoStock, {
          ingredienteId,
          tipo: StockMovementType.AJUSTE,
          cantidad: Math.abs(dto.delta).toFixed(3),
          motivo: dto.motivo,
          usuarioId,
        }),
      );

      return { ingrediente, movimiento };
    });

    return {
      ingrediente_id: result.ingrediente.id,
      stock_actual: Number(result.ingrediente.stockActual),
      movimiento: this.toMovimientoResponse(result.movimiento),
    };
  }

  async registrarSalidas(manager: EntityManager, salidas: StockSalida[]) {
    for (const salida of salidas) {
      const ingrediente = await this.findIngredienteForUpdate(manager, salida.ingredienteId);
      const nuevoStock = Number(ingrediente.stockActual) - salida.cantidad;
      if (nuevoStock < 0) {
        throw new UnprocessableEntityException(
          errorBody('STOCK_INSUFICIENTE', `Stock insuficiente para ${ingrediente.nombre}`),
        );
      }

      ingrediente.stockActual = nuevoStock.toFixed(3);
      await manager.save(ingrediente);
      await manager.save(
        manager.create(MovimientoStock, {
          ingredienteId: salida.ingredienteId,
          tipo: StockMovementType.SALIDA,
          cantidad: salida.cantidad.toFixed(3),
          motivo: salida.motivo,
          usuarioId: salida.usuarioId ?? null,
        }),
      );
    }
  }

  async findMovimientos(ingredienteId: number, query: PaginationDto) {
    await this.assertIngredienteExists(ingredienteId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.movimientosRepo.findAndCount({
      where: { ingredienteId },
      order: { fechaUtc: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items.map((movimiento) => this.toMovimientoResponse(movimiento)),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  private async assertIngredienteExists(ingredienteId: number) {
    const ingrediente = await this.ingredientesRepo.findOne({ where: { id: ingredienteId } });
    if (!ingrediente) {
      throw new NotFoundException(errorBody('INGREDIENTE_NO_ENCONTRADO', 'Ingrediente no encontrado'));
    }
  }

  private async findIngredienteForUpdate(manager: EntityManager, ingredienteId: number) {
    const ingrediente = await manager.findOne(Ingrediente, {
      where: { id: ingredienteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ingrediente) {
      throw new NotFoundException(errorBody('INGREDIENTE_NO_ENCONTRADO', 'Ingrediente no encontrado'));
    }
    return ingrediente;
  }

  private toMovimientoResponse(movimiento: MovimientoStock) {
    return {
      id: movimiento.id,
      ingrediente_id: movimiento.ingredienteId,
      tipo: movimiento.tipo,
      cantidad: Number(movimiento.cantidad),
      motivo: movimiento.motivo,
      usuario_id: movimiento.usuarioId,
      fecha_utc: movimiento.fechaUtc,
    };
  }
}
