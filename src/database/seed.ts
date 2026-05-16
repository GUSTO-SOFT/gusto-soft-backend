import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { CategoriaProducto } from '../common/enums/product-category.enum';
import { MesaEstado } from '../common/enums/table-status.enum';
import { Rol } from '../common/enums/role.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
import { Ingrediente } from '../inventory/entities/ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { Mesa } from '../tables/entities/restaurant-table.entity';
import { Notificacion } from '../notifications/entities/notification.entity';
import { PedidoDetalle } from '../orders/entities/order-item.entity';
import { PedidoEstadoHistorial } from '../orders/entities/order-status-history.entity';
import { Pedido } from '../orders/entities/order.entity';
import { Usuario } from '../users/entities/user.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'gusto_soft',
  synchronize: process.env.DB_SYNC !== 'false',
  entities: [Usuario, Mesa, Ingrediente, Producto, Pedido, PedidoDetalle, PedidoEstadoHistorial, Notificacion],
  timezone: 'Z',
});

async function seed() {
  await dataSource.initialize();

  const usuariosRepo = dataSource.getRepository(Usuario);
  const mesasRepo = dataSource.getRepository(Mesa);
  const ingredientesRepo = dataSource.getRepository(Ingrediente);
  const productosRepo = dataSource.getRepository(Producto);
  const passwordHash = await bcrypt.hash('REMOVED_SEED_PASSWORD', Number(process.env.BCRYPT_ROUNDS ?? 10));

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
    { nombre: 'Tomate', unidadMedida: 'kg' },
    { nombre: 'Pan artesanal', unidadMedida: 'unidad' },
    { nombre: 'Carne de res', unidadMedida: 'kg' },
    { nombre: 'Queso', unidadMedida: 'kg' },
    { nombre: 'Cafe', unidadMedida: 'g' },
  ];

  for (const ingrediente of ingredientesBase) {
    const exists = await ingredientesRepo.findOne({ where: { nombre: ingrediente.nombre } });
    if (!exists) {
      await ingredientesRepo.save(ingredientesRepo.create(ingrediente));
    }
  }

  const ingredientes = await ingredientesRepo.find();
  const productoExists = await productosRepo.findOne({ where: { nombre: 'Hamburguesa clasica' } });
  if (!productoExists) {
    await productosRepo.save(
      productosRepo.create({
        nombre: 'Hamburguesa clasica',
        categoria: CategoriaProducto.PLATO_FUERTE,
        precio: '28000.00',
        tiempoPreparacion: 15,
        imagenUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        activo: true,
        ingredientes: ingredientes.filter((ingrediente) =>
          ['Pan artesanal', 'Carne de res', 'Queso', 'Tomate'].includes(ingrediente.nombre),
        ),
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
