import type { CorsOptions } from './cors';
import type { BaseConfig, DatabaseConfig } from './database';
import type { LoggerConfig } from './logger';

export interface ConfigRegistry {
  database: DatabaseConfig;
  connections: DatabaseConfig;
  logger: LoggerConfig;
  cors: CorsOptions;
  app: AppConfig;
  [key: string]: BaseConfig;
}

export interface AppConfig {
  env: string;
  name: string;
  port: number;
  booted: boolean;
  onBoot: () => Promise<void>;
}
