import type { Knex } from 'knex';
import type { ModelConstructor } from './Model';

export class ModelQuery<T> {
  private query: Knex.QueryBuilder;
  private model: ModelConstructor<T>;
  private eagerLoads: string[] = [];
  private cachedColumns: string[] | null = null;

  constructor(query: Knex.QueryBuilder, model: ModelConstructor<T>) {
    this.query = query;
    this.model = model;
    this.initColumns();
  }

  private initColumns(): void {}

  private getColumns(): Promise<string[]> | string[] {
    if (!this.query.columnInfo) {
      return [];
    }

    if (this.cachedColumns !== null) {
      return this.cachedColumns;
    }

    return this.query.columnInfo().then((columns) => {
      this.cachedColumns = Object.keys(columns);
      return this.cachedColumns;
    });
  }

  where(column: string, value: any): ModelQuery<T> {
    this.query = this.query.where(column, value);
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): ModelQuery<T> {
    this.query = this.query.orderBy(column, direction);
    return this;
  }

  limit(limit: number): ModelQuery<T> {
    this.query = this.query.limit(limit);
    return this;
  }

  async first(): Promise<T | null> {
    const result = await this.query.first();

    return await this.handleEagerLoads(result);
  }

  async get(): Promise<T[]> {
    const results = await this.query.select();
    return Promise.all(
      results.map((result: T) => this.handleEagerLoads(result))
    );
  }

  async count(): Promise<number> {
    const result = await this.query.count({ count: '*' }).first();
    return result ? parseInt(result.count, 10) : 0;
  }

  async delete(): Promise<number> {
    return this.query.delete();
  }

  select(keys: string[]): ModelQuery<T> {
    this.query.select(keys);

    return this;
  }

  /**
   * Add relationships for eager loading.
   * @param relations Array of relationships to load.
   */
  with(...relations: string[]): ModelQuery<T> {
    this.eagerLoads.push(...relations);
    return this;
  }

  whereNot(column: string, value: any): ModelQuery<T> {
    this.query = this.query.whereNot(column, value);
    return this;
  }

  whereIn(column: string, values: any[]): ModelQuery<T> {
    this.query = this.query.whereIn(column, values);
    return this;
  }

  whereNotIn(column: string, values: any[]): ModelQuery<T> {
    this.query = this.query.whereNotIn(column, values);
    return this;
  }

  whereBetween(column: string, range: [any, any]): ModelQuery<T> {
    this.query = this.query.whereBetween(column, range);
    return this;
  }

  whereNull(column: string): ModelQuery<T> {
    this.query = this.query.whereNull(column);
    return this;
  }

  whereNotNull(column: string): ModelQuery<T> {
    this.query = this.query.whereNotNull(column);
    return this;
  }

  // Pagination methods
  offset(offset: number): ModelQuery<T> {
    this.query = this.query.offset(offset);
    return this;
  }

  paginate(
    page: number,
    perPage: number = 15
  ): Promise<{
    data: T[];
    total: number;
    lastPage: number;
    currentPage: number;
  }> {
    return this.paginateQuery(page, perPage);
  }

  private async paginateQuery(
    page: number,
    perPage: number
  ): Promise<{
    data: T[];
    total: number;
    lastPage: number;
    currentPage: number;
  }> {
    const total = await this.query.clone().count('* as count').first();
    const totalCount = total ? parseInt(total.count as string, 10) : 0;
    const lastPage = Math.ceil(totalCount / perPage);

    const results = await this.query
      .clone()
      .limit(perPage)
      .offset((page - 1) * perPage)
      .select();

    const data = await Promise.all(
      results.map((result: T) => this.handleEagerLoads(result))
    );

    return {
      data,
      total: totalCount,
      lastPage,
      currentPage: page,
    };
  }

  /**
   * Handle eager loading of specified relationships.
   * @param result The result from the database query.
   */
  private async handleEagerLoads(result: T | null): Promise<T | null> {
    if (!result || this.eagerLoads.length === 0) return result;

    if (!(result instanceof this.model)) {
      result = Object.assign(new this.model(), result);
    }

    for (const relation of this.eagerLoads) {
      if (typeof (result as any)[relation] === 'function') {
        const relationData = await (result as any)[relation]()?.get();

        (result as any)[relation] = await Promise.all(
          relationData?.map((item: T) =>
            this.stripModelProperties(item, relation)
          )
        );
      }
    }

    return await this.stripModelProperties(result, this.eagerLoads);
  }

  private async stripModelProperties(
    obj: T | null,
    relation: string | string[]
  ): Promise<T | null> {
    if (!obj) return null;
    const acceptedColumns = await this.getColumns();
    const serialized: Record<string, any> = {};

    if (obj instanceof this.model) {
      Object.entries(obj).forEach(([key, value]) => {
        if (acceptedColumns?.includes(key)) {
          serialized[key] = value;
        }
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        serialized[key] = value;
      });
    }

    for (const key in obj) {
      if (relation.includes(key)) {
        serialized[key] = (obj as any)[key];
      }
    }

    return serialized as T;
  }
}
