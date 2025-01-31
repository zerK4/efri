export interface BaseConfig {
  [key: string]: any;
}

export interface DatabaseConfig extends BaseConfig {
  default: string;
  connections: {
    [key: string]: {
      driver: string;
      host?: string;
      port?: number;
      database: string;
      username?: string;
      password?: string;
      filename?: string;
    };
  };
}
