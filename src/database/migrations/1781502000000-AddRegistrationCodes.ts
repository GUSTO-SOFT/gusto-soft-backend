import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddRegistrationCodes1781502000000 implements MigrationInterface {
  name = 'AddRegistrationCodes1781502000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('codigos_registro')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'codigos_registro',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code_hash',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'created_by_admin_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'used_by_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'used_at',
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
      'codigos_registro',
      new TableIndex({
        name: 'IDX_codigos_registro_code_hash',
        columnNames: ['code_hash'],
      }),
    );
    await queryRunner.createIndex(
      'codigos_registro',
      new TableIndex({
        name: 'IDX_codigos_registro_created_by_admin_id',
        columnNames: ['created_by_admin_id'],
      }),
    );
    await queryRunner.createIndex(
      'codigos_registro',
      new TableIndex({
        name: 'IDX_codigos_registro_used_by_user_id',
        columnNames: ['used_by_user_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'codigos_registro',
      new TableForeignKey({
        name: 'FK_codigos_registro_created_by_admin_id',
        columnNames: ['created_by_admin_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'codigos_registro',
      new TableForeignKey({
        name: 'FK_codigos_registro_used_by_user_id',
        columnNames: ['used_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('codigos_registro')) {
      await queryRunner.dropTable('codigos_registro', true);
    }
  }
}
