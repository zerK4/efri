import { config } from '../config';
import { CoreError } from '../errors/CoreError';
import type { DatabaseConfig } from '../types/database';
import { Connection } from './Connection';

export class DatabaseManager {
  private connections: Map<string, Connection> = new Map();
  private config: DatabaseConfig;
  private defaultConnection: string;

  constructor(config: DatabaseConfig) {
    if (!config) {
      throw new CoreError({
        message: 'Database configuration is required',
        code: 'DATABASE_CONFIG_MISSING',
      });
    }

    if (!config.default) {
      throw new CoreError({
        message:
          'Default database connection is not specified in the configuration',
        code: 'DEFAULT_CONNECTION_MISSING',
      });
    }

    if (!config.connections || Object.keys(config.connections).length === 0) {
      throw new CoreError({
        message: 'No database connections are configured',
        code: 'NO_CONNECTIONS_CONFIGURED',
      });
    }

    this.config = config;
    this.defaultConnection = config.default;
  }

  public connection(name?: string): Connection {
    const connectionName = name || this.defaultConnection;

    if (!this.config.connections[connectionName]) {
      throw new CoreError({
        message: `Database connection '${connectionName}' is not configured`,
        code: 'CONNECTION_NOT_CONFIGURED',
      });
    }

    if (!this.connections.has(connectionName)) {
      const connectionConfig = this.config.connections[connectionName];
      try {
        const connection = new Connection(connectionConfig);
        this.connections.set(connectionName, connection);
      } catch (error) {
        throw new CoreError({
          message: `Failed to create connection for '${connectionName}'`,
          code: 'CONNECTION_CREATION_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const connection = this.connections.get(connectionName);
    if (!connection) {
      throw new CoreError({
        message: `Connection '${connectionName}' is not available`,
        code: 'CONNECTION_NOT_AVAILABLE',
      });
    }

    return connection;
  }

  public async disconnect(name?: string): Promise<void> {
    try {
      if (name) {
        const connection = this.connections.get(name);
        if (connection) {
          await connection.disconnect();
          this.connections.delete(name);
        } else {
          throw new CoreError({
            message: `Connection '${name}' not found`,
            code: 'CONNECTION_NOT_FOUND',
          });
        }
      } else {
        await Promise.all(
          [...this.connections.values()].map((conn) => conn.disconnect())
        );
        this.connections.clear();
      }
    } catch (error) {
      throw new CoreError({
        message: 'Failed to disconnect database connection(s)',
        code: 'DISCONNECTION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
