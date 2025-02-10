import type { CorsOptions } from './cors';
import type { BaseConfig, DatabaseConfig } from './database';
import type { LoggerConfig } from './logger';

export interface ConfigRegistry {
  database: DatabaseConfig;
  connections: DatabaseConfig;
  logger: LoggerConfig;
  cors: CorsOptions;
  [key: string]: BaseConfig;
}
