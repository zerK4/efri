import type { BaseConfig, DatabaseConfig } from './database';
import type { LoggerConfig } from './logger';

export interface ConfigRegistry {
  database: DatabaseConfig;
  connections: DatabaseConfig;
  logger: LoggerConfig;
  [key: string]: BaseConfig;
}
