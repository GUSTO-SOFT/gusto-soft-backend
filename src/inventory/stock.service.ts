import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { errorBody } from '../common/utils/error-response';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AlertaInventario } from './entities/inventory-alert.entity';
import { Ingrediente } from './entities/ingredient.entity';
import { MovimientoStock } from './entities/stock-movement.entity';
import { InventarioEventosGateway } from './inventory.gateway';

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
    @InjectRepository(AlertaInventario) private readonly alertasRepo: Repository<AlertaInventario>,
    private readonly inventarioGateway: InventarioEventosGateway,
  ) {}

  async ajustarStock(ingredienteId: number, dto: AdjustStockDto, usuarioId: number) {
    const result = await this.ingredientesRepo.manager.transaction(async (manager) => {
      const ingrediente = await this.findIngredienteForUpdate(manager, ingredienteId);
      const stockAnterior = Number(ingrediente.stockActual);
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

      await this.evaluarInventarioPostActualizacion(manager, ingrediente, stockAnterior, nuevoStock);

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
      const stockAnterior = Number(ingrediente.stockActual);
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
      await this.evaluarInventarioPostActualizacion(manager, ingrediente, stockAnterior, nuevoStock);
    }
  }

  async findAlertasActivas() {
    const alertas = await this.alertasRepo.find({
      where: { activa: true },
      relations: { ingrediente: true },
      order: { generadaAt: 'DESC' },
    });

    return alertas.map((alerta) => ({
      id: alerta.id,
      ingrediente_id: alerta.ingredienteId,
      nombre: alerta.ingrediente.nombre,
      stock_actual: Number(alerta.ingrediente.stockActual),
      stock_minimo: Number(alerta.ingrediente.stockMinimo),
      generada_at: alerta.generadaAt,
    }));
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

  private async evaluarInventarioPostActualizacion(
    manager: EntityManager,
    ingrediente: Ingrediente,
    stockAnterior: number,
    stockActual: number,
  ) {
    const stockMinimo = Number(ingrediente.stockMinimo);

    if (stockActual <= stockMinimo) {
      const alerta = await this.ensureAlertaActiva(manager, ingrediente);
      this.inventarioGateway.emitAlertaStockMinimo({
        id: alerta.id,
        ingrediente_id: ingrediente.id,
        nombre: ingrediente.nombre,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        generada_at: alerta.generadaAt,
        roles: ['ADMIN', 'CHEF'],
      });
    } else {
      await this.cancelarAlertasActivas(manager, ingrediente.id);
    }

    if (stockActual === 0) {
      await this.bloquearProductosPorIngrediente(manager, ingrediente.id);
    } else if (stockAnterior === 0) {
      await this.reactivarProductosPorIngrediente(manager, ingrediente.id);
    }
  }

  private async ensureAlertaActiva(manager: EntityManager, ingrediente: Ingrediente) {
    const alertaActiva = await manager.findOne(AlertaInventario, {
      where: { ingredienteId: ingrediente.id, activa: true },
      relations: { ingrediente: true },
    });
    if (alertaActiva) {
      return alertaActiva;
    }

    const alerta = manager.create(AlertaInventario, {
      ingredienteId: ingrediente.id,
      ingrediente,
      activa: true,
    });
    return manager.save(alerta);
  }

  private async cancelarAlertasActivas(manager: EntityManager, ingredienteId: number) {
    await manager.update(AlertaInventario, { ingredienteId, activa: true }, { activa: false });
  }

  private async bloquearProductosPorIngrediente(manager: EntityManager, ingredienteId: number) {
    const productoIds = await this.findProductoIdsPorIngrediente(manager, ingredienteId);
    if (productoIds.length) {
      await manager.update(Producto, { id: In(productoIds) }, { activo: false });
    }
  }

  private async reactivarProductosPorIngrediente(manager: EntityManager, ingredienteId: number) {
    const productoIds = await this.findProductoIdsPorIngrediente(manager, ingredienteId);
    if (!productoIds.length) {
      return;
    }

    const productos = await manager.find(Producto, {
      where: { id: In(productoIds) },
      relations: ['ingredientes', 'recipeIngredients', 'recipeIngredients.ingrediente'],
    });

    for (const producto of productos) {
      const ingredientes = producto.recipeIngredients?.length
        ? producto.recipeIngredients.map((recipe) => recipe.ingrediente)
        : producto.ingredientes ?? [];
      const todosConStock = ingredientes.every((ing) => Number(ing.stockActual) > 0);
      if (todosConStock) {
        producto.activo = true;
        await manager.save(producto);
      }
    }
  }

  private async findProductoIdsPorIngrediente(manager: EntityManager, ingredienteId: number) {
    const recipeRows = await manager.find(ProductRecipeIngredient, { where: { ingredienteId } });
    const ids = new Set(recipeRows.map((row) => row.productoId));

    const productsByManyToMany = await manager
      .createQueryBuilder(Producto, 'producto')
      .innerJoin('producto.ingredientes', 'ingrediente', 'ingrediente.id = :ingredienteId', {
        ingredienteId,
      })
      .select('producto.id', 'id')
      .getRawMany<{ id: number }>();

    for (const row of productsByManyToMany) {
      ids.add(Number(row.id));
    }
    return [...ids];
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
