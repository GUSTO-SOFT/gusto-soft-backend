import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { CategoriaProducto } from '../common/enums/product-category.enum';
import { MesaEstado } from '../common/enums/table-status.enum';
import { Rol } from '../common/enums/role.enum';
import { UnitMeasure } from '../common/enums/unit-measure.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
import { Ingrediente } from '../inventory/entities/ingredient.entity';
import { MovimientoStock } from '../inventory/entities/stock-movement.entity';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { Mesa } from '../tables/entities/restaurant-table.entity';
import { Notificacion } from '../notifications/entities/notification.entity';
import { PedidoDetalle } from '../orders/entities/order-item.entity';
import { PedidoEstadoHistorial } from '../orders/entities/order-status-history.entity';
import { Pedido } from '../orders/entities/order.entity';
import { SystemParameter } from '../reports/entities/system-parameter.entity';
import { Usuario } from '../users/entities/user.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'gusto_soft',
  synchronize: (process.env.DB_SYNC ?? process.env.TYPEORM_SYNCHRONIZE) !== 'false',
  entities: [
    Usuario,
    Mesa,
    Ingrediente,
    MovimientoStock,
    Producto,
    ProductRecipeIngredient,
    Pedido,
    PedidoDetalle,
    PedidoEstadoHistorial,
    Notificacion,
    SystemParameter,
  ],
  timezone: 'Z',
});

async function seed() {
  await dataSource.initialize();

  const usuariosRepo = dataSource.getRepository(Usuario);
  const mesasRepo = dataSource.getRepository(Mesa);
  const ingredientesRepo = dataSource.getRepository(Ingrediente);
  const productosRepo = dataSource.getRepository(Producto);
  const passwordHash = await bcrypt.hash('Password123!', Number(process.env.BCRYPT_ROUNDS ?? process.env.BYCRYPT_ROUNDS ?? 10));

  const usuarios = [
    { nombre: 'Admin Demo', email: 'admin@gustosoft.local', rol: Rol.ADMIN },
    { nombre: 'Mesero Demo', email: 'mesero@gustosoft.local', rol: Rol.MESERO },
    { nombre: 'Chef Demo', email: 'chef@gustosoft.local', rol: Rol.CHEF },
  ];

  for (const usuario of usuarios) {
    const exists = await usuariosRepo.findOne({ where: { email: usuario.email } });
    if (!exists) {
      await usuariosRepo.save(
        usuariosRepo.create({
          ...usuario,
          passwordHash,
          estado: UsuarioEstado.ACTIVO,
        }),
      );
    }
  }

  for (let numero = 1; numero <= 12; numero += 1) {
    const exists = await mesasRepo.findOne({ where: { numero } });
    if (!exists) {
      await mesasRepo.save(mesasRepo.create({ numero, estado: MesaEstado.DISPONIBLE }));
    }
  }

  const ingredientesBase = [
    { nombre: 'Tomate', unidadMedida: UnitMeasure.KG, stockActual: '20.000', stockMinimo: '3.000', activo: true },
    { nombre: 'Pan artesanal', unidadMedida: UnitMeasure.UNIDAD, stockActual: '80.000', stockMinimo: '10.000', activo: true },
    { nombre: 'Carne de res', unidadMedida: UnitMeasure.KG, stockActual: '30.000', stockMinimo: '5.000', activo: true },
    { nombre: 'Queso', unidadMedida: UnitMeasure.KG, stockActual: '12.000', stockMinimo: '2.000', activo: true },
    { nombre: 'Cafe', unidadMedida: UnitMeasure.G, stockActual: '5000.000', stockMinimo: '500.000', activo: true },
  ];

  for (const ingrediente of ingredientesBase) {
    const exists = await ingredientesRepo.findOne({ where: { nombre: ingrediente.nombre } });
    if (!exists) {
      await ingredientesRepo.save(ingredientesRepo.create(ingrediente));
    }
  }

  const ingredientes = await ingredientesRepo.find();
  const ingredientesByName = new Map(ingredientes.map((ingrediente) => [ingrediente.nombre, ingrediente]));
  const productoExists = await productosRepo.findOne({ where: { nombre: 'Hamburguesa clasica' } });
  if (!productoExists) {
    await productosRepo.save(
      productosRepo.create({
        nombre: 'Hamburguesa clasica',
        categoria: CategoriaProducto.PLATO_FUERTE,
        precio: '28000.00',
        tiempoPreparacion: 15,
        activo: true,
        ingredientes: ['Pan artesanal', 'Carne de res', 'Queso', 'Tomate']
          .map((name) => ingredientesByName.get(name))
          .filter((ingrediente): ingrediente is Ingrediente => Boolean(ingrediente)),
        recipeIngredients: [
          { ingredienteId: ingredientesByName.get('Pan artesanal')?.id, cantidadIngrediente: '1.000' },
          { ingredienteId: ingredientesByName.get('Carne de res')?.id, cantidadIngrediente: '0.180' },
          { ingredienteId: ingredientesByName.get('Queso')?.id, cantidadIngrediente: '0.040' },
          { ingredienteId: ingredientesByName.get('Tomate')?.id, cantidadIngrediente: '0.050' },
        ].map((recipe) => dataSource.getRepository(ProductRecipeIngredient).create(recipe)),
      }),
    );
  }

  await dataSource.destroy();
  console.log('Seed ejecutado correctamente');
}

seed().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
