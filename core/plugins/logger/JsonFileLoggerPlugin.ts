import * as fs from 'fs';
import * as path from 'path';
import type { LoggerConfig, LoggerPlugin } from '../../types';
import { PluginLoader } from '../PluginLoader';
import { config } from '../../config';
import { CoreLogger } from '../../logger';

class JsonFileLoggerPlugin implements LoggerPlugin {
  type = 'logger' as const;
  name = 'json';
  loggerInstance = CoreLogger.getInstance();
  routes = [];
  methods = {
    log: (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: any,
      context: any,
      config: LoggerConfig
    ): void => {
      // Format the log entry
      const logEntry = {
        level,
        timestamp: new Date().toISOString(),
        message:
          typeof message === 'string'
            ? message
            : this.loggerInstance.formatMessage(message),
        context: this.loggerInstance.formatMessage(context),
      };

      const logMessage = JSON.stringify(logEntry) + '\n';

      fs.appendFileSync(config.filePath.replace('.log', '.json'), logMessage);
    },
  };

  constructor() {
    this.setupJsonFileLogging();
  }

  private setupJsonFileLogging(): void {
    const filePath =
      config.get('logger')?.filePath.replace('.log', '.json') ||
      './logs/app.json';
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export default PluginLoader.registerPlugin(new JsonFileLoggerPlugin());
