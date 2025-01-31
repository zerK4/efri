import { Knex } from 'knex';

export class Schema {
  private connection: Knex;

  constructor(connection: Knex) {
    this.connection = connection;
  }

  public async create(
    tableName: string,
    callback: (table: Knex.CreateTableBuilder) => void
  ): Promise<void> {
    await this.connection.schema.createTable(tableName, callback);
  }

  public async table(
    tableName: string,
    callback: (table: Knex.AlterTableBuilder) => void
  ): Promise<void> {
    await this.connection.schema.alterTable(tableName, callback);
  }

  public async drop(tableName: string): Promise<void> {
    await this.connection.schema.dropTable(tableName);
  }

  public async dropIfExists(tableName: string): Promise<void> {
    await this.connection.schema.dropTableIfExists(tableName);
  }
}
