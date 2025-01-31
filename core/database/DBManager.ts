import type { DatabaseConfig } from '@/types/database';
import { Connection } from './Connection';

export class DatabaseManager {
  private connections: Map<string, Connection> = new Map();
  private config: DatabaseConfig;
  private defaultConnection: string;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.defaultConnection = config.default;
  }

  public connection(name?: string): Connection {
    const connectionName = name || this.defaultConnection;

    if (!this.connections.has(connectionName)) {
      const connectionConfig = this.config.connections[connectionName];
      if (!connectionConfig) {
        throw new Error(
          `Database connection '${connectionName}' not configured`
        );
      }
      this.connections.set(connectionName, new Connection(connectionConfig));
    }

    return this.connections.get(connectionName)!;
  }

  public async disconnect(name?: string): Promise<void> {
    if (name) {
      await this.connections.get(name)?.disconnect();
      this.connections.delete(name);
    } else {
      await Promise.all(
        [...this.connections.values()].map((conn) => conn.disconnect())
      );
      this.connections.clear();
    }
  }
}
