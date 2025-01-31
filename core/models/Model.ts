import type { Knex } from 'knex';
import { DatabaseManager } from '@/database/DBManager';
import { ModelQuery } from './ModelQuery';
import { ConfigLoader } from '@/config/config/ConfigLoader';

const databaseConfig = await ConfigLoader.getConfig('connections');

export type ModelConstructor<T> = new () => Model<T>;

export abstract class Model<T> {
  protected static connection: DatabaseManager;
  protected table?: string;
  protected get DB(): Knex.QueryBuilder {
    return Model.connection
      .connection()
      .query()
      .table(this.table ?? '');
  }
  protected primaryKey: string = 'id';
  protected timestamps: boolean = true;
  [key: string]: any;

  constructor() {
    if (!Model.connection) {
      if (!databaseConfig) {
        throw new Error('Database config not found');
      }

      Model.connection = new DatabaseManager(databaseConfig);
    }
  }

  // Query builder methods
  newQuery(): Knex.QueryBuilder {
    return Model.connection
      .connection()
      .query()
      .table(this.getTableName() ?? '');
  }

  // Basic query methods that return query builder for chaining
  static where<T>(
    this: ModelConstructor<T>,
    column: string,
    operator: any,
    value?: any
  ): Knex.QueryBuilder {
    const instance = new this();
    return value !== undefined
      ? instance.newQuery().where(column, operator, value)
      : instance.newQuery().where(column, operator);
  }

  static whereIn<T>(
    this: ModelConstructor<T>,
    column: string,
    values: any[]
  ): Knex.QueryBuilder {
    const instance = new this();
    return instance.newQuery().whereIn(column, values);
  }

  static select<T>(
    this: ModelConstructor<T>,
    ...columns: string[]
  ): ModelQuery<T> {
    const instance = new this();
    const query = instance.newQuery().select(...columns);

    return new ModelQuery(query, this);
  }

  // Executor methods
  static async first<T>(this: ModelConstructor<T>): Promise<T | undefined> {
    const instance = new this();
    const result = await instance.newQuery().first();
    return result;
  }

  static async get<T>(this: ModelConstructor<T>): Promise<T[]> {
    const instance = new this();
    return instance.newQuery().select();
  }

  static async count<T>(this: ModelConstructor<T>): Promise<number> {
    const instance = new this();
    const result = await instance
      .newQuery()
      .count(`${instance.primaryKey} as count`)
      .first();
    return Number(result?.count || 0);
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
    const total = await instance.count();
    console.log(total, 'tje total');
    const lastPage = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    const data = await instance.newQuery().limit(perPage).offset(offset);

    return {
      data,
      total,
      page,
      lastPage,
    };
  }

  // CRUD Operations
  static async create<T>(
    this: ModelConstructor<T>,
    attributes: Partial<T>
  ): Promise<T> {
    const instance = new this();
    return instance.create(attributes);
  }

  async create(attributes: Partial<T>): Promise<T> {
    if (this.timestamps) {
      (attributes as any).created_at = new Date();
      (attributes as any).updated_at = new Date();
    }

    const [created] = await this.newQuery().insert(attributes).returning('*');
    return created;
  }

  static async update<T>(
    this: ModelConstructor<T>,
    id: number | string,
    attributes: Partial<T>
  ): Promise<T> {
    const instance = new this();
    return instance.update(id, attributes);
  }

  async update(id: number | string, attributes: Partial<T>): Promise<T> {
    if (this.timestamps) {
      (attributes as any).updated_at = new Date();
    }

    const [updated] = await this.newQuery()
      .where(this.primaryKey, id)
      .update(attributes)
      .returning('*');

    return updated;
  }

  static async delete<T>(
    this: ModelConstructor<T>,
    id: number | string
  ): Promise<boolean> {
    const instance = new this();
    return instance.delete(id);
  }

  async delete(id: number | string): Promise<boolean> {
    const deleted = await this.newQuery().where(this.primaryKey, id).delete();

    return deleted > 0;
  }

  static find<T>(
    this: ModelConstructor<T>,
    id: number | string
  ): ModelQuery<T> {
    const instance = new this();

    const query = instance.DB.where(instance.getPrimaryKey(), id);
    return new ModelQuery(query, this);
  }

  protected async count(): Promise<number> {
    return await Model.connection
      .connection()
      .query()
      .count('* as count')
      .from(this.getTableName() ?? '')
      .then((result) => parseInt((result[0] as any).count, 10));
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

  //**
  // TODO: Implement relationship
  //  */
  // async hasMany(
  //   model: ModelConstructor<any>,
  //   foreignKey: string | number,
  //   targetKey: string | number
  // ): Promise<HasManyRelation<this, any>> {
  //   const query = new HasManyRelation(this, model, foreignKey, targetKey).get();
  //   return await query;
  // }
}
