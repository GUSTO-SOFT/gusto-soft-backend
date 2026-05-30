import 'dotenv/config';
import mysql from 'mysql2/promise';

const database = process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'gusto_soft';

const connectionConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database,
  multipleStatements: false,
};

const renames = [
  ['accounts', 'mesa_id', 'table_id'],
  ['accounts', 'estado', 'status'],
  ['accounts', 'impuestos', 'taxes'],
  ['accounts', 'total_bruto', 'gross_total'],
  ['accounts', 'descuento', 'discount'],
  ['accounts', 'descuento_tipo', 'discount_type'],
  ['accounts', 'descuento_motivo', 'discount_reason'],
  ['accounts', 'descuento_usuario_id', 'discount_user_id'],
  ['accounts', 'total_neto', 'net_total'],
  ['accounts', 'metodo_pago', 'payment_method'],
  ['accounts', 'monto_recibido', 'amount_received'],
  ['accounts', 'cambio', 'change_amount'],
  ['accounts', 'cajero_id', 'cashier_id'],

  ['billing_audits', 'cuenta_id', 'account_id'],
  ['billing_audits', 'cajero_id', 'cashier_id'],
  ['billing_audits', 'total_neto', 'net_total'],
  ['billing_audits', 'descuento', 'discount'],

  ['invoices', 'cuenta_id', 'account_id'],
  ['invoices', 'documento', 'document'],
  ['invoices', 'estado', 'status'],
  ['invoices', 'respuesta_proveedor', 'provider_response'],
  ['invoices', 'intentos', 'attempts'],

  ['invoice_emails', 'factura_id', 'invoice_id'],
  ['invoice_emails', 'email_destino', 'destination_email'],
  ['invoice_emails', 'estado', 'status'],
  ['invoice_emails', 'detalle_error', 'error_detail'],

  ['stock_movements', 'tipo', 'type'],
  ['stock_movements', 'cantidad', 'quantity'],
  ['stock_movements', 'motivo', 'reason'],
  ['stock_movements', 'fecha_utc', 'timestamp_utc'],

  ['menu_audits', 'usuario_id', 'user_id'],
  ['menu_audits', 'accion', 'action'],
  ['menu_audits', 'campo_modificado', 'changed_field'],
  ['menu_audits', 'valor_anterior', 'previous_value'],
  ['menu_audits', 'valor_nuevo', 'new_value'],
  ['menu_audits', 'producto_id', 'product_id'],

  ['companies', 'nit', 'tax_id'],

  ['product_recipe_ingredients', 'quantity_ingredient', 'ingredient_quantity'],
];

const legacySpanishTables = [
  'alertas_inventario',
  'auditoria_facturacion',
  'auditoria_menu',
  'cuentas',
  'empresa',
  'factura_envios',
  'facturas',
];

const quoteIdentifier = (value) => `\`${String(value).replaceAll('`', '``')}\``;

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
      LIMIT 1`,
    [database, tableName],
  );

  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [database, tableName, columnName],
  );

  return rows.length > 0;
}

async function countRows(connection, tableName) {
  const [[row]] = await connection.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);

  return Number(row.count);
}

async function main() {
  const connection = await mysql.createConnection(connectionConfig);

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const [tableName, oldColumn, newColumn] of renames) {
      const hasOldColumn = await columnExists(connection, tableName, oldColumn);
      const hasNewColumn = await columnExists(connection, tableName, newColumn);

      if (!hasOldColumn) {
        console.log(`skip ${tableName}.${oldColumn}: old column does not exist`);
        continue;
      }

      if (hasNewColumn) {
        console.log(`manual check ${tableName}: both ${oldColumn} and ${newColumn} exist`);
        continue;
      }

      await connection.query(
        `ALTER TABLE ${quoteIdentifier(tableName)} RENAME COLUMN ${quoteIdentifier(oldColumn)} TO ${quoteIdentifier(newColumn)}`,
      );
      console.log(`renamed ${tableName}.${oldColumn} -> ${newColumn}`);
    }

    for (const tableName of legacySpanishTables) {
      const exists = await tableExists(connection, tableName);

      if (!exists) {
        console.log(`skip ${tableName}: legacy table does not exist`);
        continue;
      }

      const rowCount = await countRows(connection, tableName);

      if (rowCount > 0) {
        console.log(`manual check ${tableName}: legacy table has ${rowCount} rows`);
        continue;
      }

      await connection.query(`DROP TABLE ${quoteIdentifier(tableName)}`);
      console.log(`dropped empty legacy table ${tableName}`);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
