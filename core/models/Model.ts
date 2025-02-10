import type { Knex } from 'knex';
import { config } from '../config/config/';
import { DatabaseManager } from '../database/DBManager';
import { ModelQuery } from './ModelQuery';
import { CoreError } from '../errors/CoreError';

const databaseConfig = config.get('connections');

export type ModelConstructor<T> = new () => Model<T>;

export abstract class Model<T> {
  protected static connection: DatabaseManager;
  protected table?: string;
  protected primaryKey: string = 'id';
  protected timestamps: boolean = true;
  [key: string]: any;

  constructor() {
    if (!Model.connection) {
      if (!databaseConfig) {
        throw new CoreError({
          message: 'Database configuration not found',
          code: 'DATABASE_CONFIG_MISSING',
        });
      }

      try {
        Model.connection = new DatabaseManager(databaseConfig);
      } catch (error) {
        throw new CoreError({
          message: 'Failed to initialize database connection',
          code: 'DATABASE_INITIALIZATION_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  protected get DB(): Knex.QueryBuilder {
    if (!this.table) {
      throw new CoreError({
        message: 'Table name is not defined',
        code: 'TABLE_NAME_MISSING',
      });
    }

    try {
      return Model.connection.connection().query().table(this.table);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to create database query builder',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Query builder methods
  newQuery(): Knex.QueryBuilder {
    if (!this.table) {
      throw new CoreError({
        message: 'Table name is not defined',
        code: 'TABLE_NAME_MISSING',
      });
    }

    try {
      return Model.connection.connection().query().table(this.table);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to create database query builder',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Basic query methods that return query builder for chaining
  static where<T>(
    this: ModelConstructor<T>,
    column: string,
    operator: any,
    value?: any
  ): Knex.QueryBuilder {
    const instance = new this();
    try {
      return value !== undefined
        ? instance.newQuery().where(column, operator, value)
        : instance.newQuery().where(column, operator);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to build WHERE query',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static whereIn<T>(
    this: ModelConstructor<T>,
    column: string,
    values: any[]
  ): Knex.QueryBuilder {
    const instance = new this();
    try {
      return instance.newQuery().whereIn(column, values);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to build WHERE IN query',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static select<T>(
    this: ModelConstructor<T>,
    ...columns: string[]
  ): ModelQuery<T> {
    const instance = new this();
    try {
      const query = instance.newQuery().select(...columns);
      return new ModelQuery(query, this);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to build SELECT query',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Executor methods
  static async first<T>(this: ModelConstructor<T>): Promise<T | undefined> {
    const instance = new this();
    try {
      const result = await instance.newQuery().first();
      return result;
    } catch (error) {
      throw new CoreError({
        message: 'Failed to fetch first record',
        code: 'QUERY_EXECUTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async get<T>(this: ModelConstructor<T>): Promise<T[]> {
    const instance = new this();
    try {
      return await instance.newQuery().select();
    } catch (error) {
      throw new CoreError({
        message: 'Failed to fetch records',
        code: 'QUERY_EXECUTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async count<T>(this: ModelConstructor<T>): Promise<number> {
    const instance = new this();
    try {
      const result = await instance
        .newQuery()
        .count(`${instance.primaryKey} as count`)
        .first();
      return Number(result?.count || 0);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to count records',
        code: 'QUERY_EXECUTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Retrieves a paginated list of records from the database.
   *
   * @param page The page number to retrieve.
   * @param perPage The number of records to retrieve per page.
   * @returns An object containing the paginated data, the total number of records, the current page, and the last page number.
   */
  static async paginate<T>(
    this: ModelConstructor<T>,
    page: number = 1,
    perPage: number = 15
  ): Promise<{ data: T[]; total: number; page: number; lastPage: number }> {
    const instance = new this();
    try {
      const total = await instance.count();
      const lastPage = Math.ceil(total / perPage);
      const offset = (page - 1) * perPage;

      const data = await instance.newQuery().limit(perPage).offset(offset);

      return {
        data,
        total,
        page,
        lastPage,
      };
    } catch (error) {
      throw new CoreError({
        message: 'Failed to paginate records',
        code: 'QUERY_EXECUTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // CRUD Operations
  static async create<T>(
    this: ModelConstructor<T>,
    attributes: Partial<T>
  ): Promise<T> {
    const instance = new this();
    try {
      return await instance.create(attributes);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to create record',
        code: 'CREATE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async create(attributes: Partial<T>): Promise<T> {
    if (this.timestamps) {
      (attributes as any).created_at = new Date();
      (attributes as any).updated_at = new Date();
    }

    try {
      const [created] = await this.newQuery().insert(attributes).returning('*');
      return created;
    } catch (error) {
      throw new CoreError({
        message: 'Failed to create record',
        code: 'CREATE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async update<T>(
    this: ModelConstructor<T>,
    id: number | string,
    attributes: Partial<T>
  ): Promise<T> {
    const instance = new this();
    try {
      return await instance.update(id, attributes);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to update record',
        code: 'UPDATE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async update(id: number | string, attributes: Partial<T>): Promise<T> {
    if (this.timestamps) {
      (attributes as any).updated_at = new Date();
    }

    try {
      const [updated] = await this.newQuery()
        .where(this.primaryKey, id)
        .update(attributes)
        .returning('*');
      return updated;
    } catch (error) {
      throw new CoreError({
        message: 'Failed to update record',
        code: 'UPDATE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async delete<T>(
    this: ModelConstructor<T>,
    id: number | string
  ): Promise<boolean> {
    const instance = new this();
    try {
      return await instance.delete(id);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to delete record',
        code: 'DELETE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async delete(id: number | string): Promise<boolean> {
    try {
      const deleted = await this.newQuery().where(this.primaryKey, id).delete();
      return deleted > 0;
    } catch (error) {
      throw new CoreError({
        message: 'Failed to delete record',
        code: 'DELETE_OPERATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static find<T>(
    this: ModelConstructor<T>,
    id: number | string
  ): ModelQuery<T> {
    const instance = new this();
    try {
      const query = instance.DB.where(instance.getPrimaryKey(), id);
      return new ModelQuery(query, this);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to find record',
        code: 'QUERY_BUILDER_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await Model.connection
        .connection()
        .query()
        .count('* as count')
        .from(this.getTableName() ?? '');
      return parseInt((result[0] as any).count, 10);
    } catch (error) {
      throw new CoreError({
        message: 'Failed to count records',
        code: 'QUERY_EXECUTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getPrimaryKey(): string {
    return this.primaryKey;
  }

  getTableName(): string | undefined {
    return this.table;
  }

  getForeignKey(): string | undefined {
    return Model.name + 's';
  }
}
