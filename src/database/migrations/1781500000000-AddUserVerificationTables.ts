import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddUserVerificationTables1781500000000 implements MigrationInterface {
  name = 'AddUserVerificationTables1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addUserVerificationColumns(queryRunner);

    if (!(await queryRunner.hasTable('codigos_verificacion'))) {
      await queryRunner.createTable(
        new Table({
          name: 'codigos_verificacion',
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
              name: 'code_hash',
              type: 'varchar',
              length: '128',
              isNullable: false,
            },
            {
              name: 'usado',
              type: 'tinyint',
              default: 0,
              isNullable: false,
            },
            {
              name: 'failed_attempts',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'last_failed_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              isNullable: false,
            },
            {
              name: 'expires_at',
              type: 'datetime',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'codigos_verificacion',
        new TableIndex({
          name: 'IDX_codigos_verificacion_user_id',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createIndex(
        'codigos_verificacion',
        new TableIndex({
          name: 'IDX_codigos_verificacion_user_usado',
          columnNames: ['user_id', 'usado'],
        }),
      );
      await queryRunner.createForeignKey(
        'codigos_verificacion',
        new TableForeignKey({
          name: 'FK_codigos_verificacion_user_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    if (!(await queryRunner.hasTable('envios_verificacion'))) {
      await queryRunner.createTable(
        new Table({
          name: 'envios_verificacion',
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
              name: 'estado',
              type: 'enum',
              enum: ['ENVIADO', 'ERROR'],
              isNullable: false,
            },
            {
              name: 'error_detail',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'sent_at',
              type: 'datetime',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'envios_verificacion',
        new TableIndex({
          name: 'IDX_envios_verificacion_user_id',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createForeignKey(
        'envios_verificacion',
        new TableForeignKey({
          name: 'FK_envios_verificacion_user_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('envios_verificacion')) {
      await queryRunner.dropTable('envios_verificacion', true);
    }

    if (await queryRunner.hasTable('codigos_verificacion')) {
      await queryRunner.dropTable('codigos_verificacion', true);
    }

    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    if (usersTable.findColumnByName('role_assigned_at')) {
      await queryRunner.dropColumn('users', 'role_assigned_at');
    }

    if (usersTable.findColumnByName('verified_at')) {
      await queryRunner.dropColumn('users', 'verified_at');
    }
  }

  private async addUserVerificationColumns(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    if (!usersTable.findColumnByName('verified_at')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'verified_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    if (!usersTable.findColumnByName('role_assigned_at')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'role_assigned_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }
}
