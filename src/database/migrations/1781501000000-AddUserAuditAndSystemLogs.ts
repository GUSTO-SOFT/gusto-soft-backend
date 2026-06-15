import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddUserAuditAndSystemLogs1781501000000 implements MigrationInterface {
  name = 'AddUserAuditAndSystemLogs1781501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.updateUsersEnums(queryRunner);
    await this.createUserAuditTable(queryRunner);
    await this.createSystemLogsTable(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('logs_sistema')) {
      await queryRunner.dropTable('logs_sistema', true);
    }

    if (await queryRunner.hasTable('auditoria_usuarios')) {
      await queryRunner.dropTable('auditoria_usuarios', true);
    }
  }

  private async updateUsersEnums(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      return;
    }

    await queryRunner.query(
      "ALTER TABLE `users` MODIFY `role` enum('ADMIN','MESERO','CHEF','CAJERO') NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `users` MODIFY `status` enum('ACTIVO','INACTIVO','PENDIENTE_ASIGNACION_ROL','PENDIENTE_VERIFICACION','EXPIRADO') NOT NULL DEFAULT 'ACTIVO'",
    );
  }

  private async createUserAuditTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('auditoria_usuarios')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'auditoria_usuarios',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'admin_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'assigned_role',
            type: 'enum',
            enum: ['ADMIN', 'MESERO', 'CHEF', 'CAJERO'],
            isNullable: false,
          },
          {
            name: 'timestamp_utc',
            type: 'datetime',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'auditoria_usuarios',
      new TableIndex({
        name: 'IDX_auditoria_usuarios_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'auditoria_usuarios',
      new TableIndex({
        name: 'IDX_auditoria_usuarios_admin_id',
        columnNames: ['admin_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'auditoria_usuarios',
      new TableForeignKey({
        name: 'FK_auditoria_usuarios_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'auditoria_usuarios',
      new TableForeignKey({
        name: 'FK_auditoria_usuarios_admin_id',
        columnNames: ['admin_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  private async createSystemLogsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('logs_sistema')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'logs_sistema',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'job',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'affected_records',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'executed_at',
            type: 'datetime',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'logs_sistema',
      new TableIndex({
        name: 'IDX_logs_sistema_job',
        columnNames: ['job'],
      }),
    );
    await queryRunner.createIndex(
      'logs_sistema',
      new TableIndex({
        name: 'IDX_logs_sistema_executed_at',
        columnNames: ['executed_at'],
      }),
    );
  }
}
