import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AuditoriaFacturacion } from '../modules/billing/entities/billing-audit.entity';
import { Cuenta } from '../modules/billing/entities/account.entity';
import { FacturaElectronica } from '../modules/billing/entities/invoice.entity';
import { FacturaEnvio } from '../modules/billing/entities/invoice-email.entity';
import { Empresa } from '../modules/company/entities/company.entity';
import { Ingrediente } from '../modules/inventory/entities/ingredient.entity';
import { AlertaInventario } from '../modules/inventory/entities/inventory-alert.entity';
import { MovimientoStock } from '../modules/inventory/entities/stock-movement.entity';
import { AuditoriaMenu } from '../modules/menu/entities/menu-audit.entity';
import { Producto } from '../modules/menu/entities/product.entity';
import { ProductRecipeIngredient } from '../modules/menu/entities/product-recipe-ingredient.entity';
import { Notificacion } from '../modules/notifications/entities/notification.entity';
import { Pedido } from '../modules/orders/entities/order.entity';
import { PedidoDetalle } from '../modules/orders/entities/order-item.entity';
import { PedidoEstadoHistorial } from '../modules/orders/entities/order-status-history.entity';
import { SystemParameter } from '../modules/reports/entities/system-parameter.entity';
import { Mesa } from '../modules/tables/entities/restaurant-table.entity';
import { Usuario } from '../modules/users/entities/user.entity';
import { envBoolean, envNumber, envString } from './env';

export const databaseEntities = [
  Usuario,
  Mesa,
  Ingrediente,
  MovimientoStock,
  AlertaInventario,
  Producto,
  ProductRecipeIngredient,
  AuditoriaMenu,
  Pedido,
  PedidoDetalle,
  PedidoEstadoHistorial,
  Notificacion,
  SystemParameter,
  Cuenta,
  AuditoriaFacturacion,
  FacturaElectronica,
  FacturaEnvio,
  Empresa,
];

export function createDataSourceOptions(): DataSourceOptions {
  const sslEnabled = envBoolean('DB_SSL', false);
  const sslCa = envString('DB_SSL_CA', '');

  return {
    type: 'mysql',
    host: envString('DB_HOST', 'localhost'),
    port: envNumber('DB_PORT', 3306),
    username: envString('DB_USERNAME', 'root'),
    password: envString('DB_PASSWORD', ''),
    database: envString('DB_DATABASE', envString('DB_NAME', 'gusto_soft')),
    synchronize: envBoolean('DB_SYNC', true),
    logging: envBoolean('DB_LOGGING', false),
    entities: databaseEntities,
    migrations: ['dist/database/migrations/*.js'],
    timezone: 'Z',
    ssl: sslEnabled
      ? {
          rejectUnauthorized: envBoolean('DB_SSL_REJECT_UNAUTHORIZED', sslCa !== ''),
          ...(sslCa ? { ca: sslCa.replace(/\\n/g, '\n') } : {}),
        }
      : undefined,
  };
}

export function createTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(),
    autoLoadEntities: true,
  };
}
