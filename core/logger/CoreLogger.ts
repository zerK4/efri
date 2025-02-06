import { config, ConfigLoader } from '../config';
import { PluginLoader } from '../plugins/PluginLoader';
import type { LoggerConfig, LoggerPlugin, LogLevel } from '../types';

const defaultConfig: LoggerConfig = {
  type: ['file', 'console'],
  level: 'info' as const,
  prettyPrint: true,
  filePath: './logs/app.log',
};

export class CoreLogger {
  private config: LoggerConfig = {} as LoggerConfig;
  private plugins: LoggerPlugin[] = [];
  private static instance: CoreLogger = new CoreLogger();

  constructor() {
    this.setupPlugins();
  }

  public static getInstance(): CoreLogger {
    if (!CoreLogger.instance) {
      CoreLogger.instance = new CoreLogger();
    }

    ConfigLoader.loadConfigsFromDirectoy().then(() => {
      const baseConfig = config.get('logger');
      const loggerConfig = baseConfig || defaultConfig;
      CoreLogger.instance.config = loggerConfig;
    });

    return CoreLogger.instance;
  }

  private async setupPlugins(): Promise<void> {
    await PluginLoader.discoverPlugins();

    this.plugins = PluginLoader.plugins.filter((plugin) => {
      return (
        plugin.type === 'logger' &&
        this.config?.type!.includes(plugin.name as any)
      );
    }) as LoggerPlugin[];
  }

  log(level: LogLevel, message: any, context?: any): void {
    if (this.shouldLog(level)) {
      this.plugins.forEach((plugin) =>
        plugin.methods.log(level, message, context, this.config)
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  debug(message: any, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: any, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: any, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: any, context?: any): void {
    this.log('error', message, context);
  }

  /**
   * Formats a message for logging, handling Error objects properly.
   * @param message The message to format.
   * @returns A string representation of the message.
   */
  formatMessage(message: any): string {
    if (message instanceof Error) {
      // Format Error objects to include the message and stack trace
      return `Error: ${message.message}\nStack: ${message.stack}`;
    } else if (typeof message === 'object' && message !== null) {
      // Stringify objects for readability
      return JSON.stringify(message, null, 2);
    } else {
      // Handle primitives (string, number, boolean, etc.)
      return String(message);
    }
  }
}

export const logger = CoreLogger.getInstance();
