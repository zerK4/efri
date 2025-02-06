import { Knex, knex } from 'knex';
import { CoreError } from '../errors/CoreError';

export class Connection {
  private connection: Knex;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.connection = this.createConnection();
  }

  private createConnection(): Knex {
    switch (this.config.driver) {
      case 'mysql':
        return knex({
          client: 'mysql2',
          connection: {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
          },
        });
      case 'postgresql':
        return knex({
          client: 'pg',
          connection: {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
          },
        });
      case 'sqlite':
        return knex({
          client: 'sqlite',
          connection: {
            filename: this.config.filename,
          },
          useNullAsDefault: true,
        });
      default:
        throw new CoreError({
          message: `Unsupported database driver: ${this.config.driver}`,
        });
    }
  }

  public query(): Knex {
    return this.connection;
  }

  public async disconnect(): Promise<void> {
    await this.connection.destroy();
  }
}
