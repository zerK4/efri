import * as fs from 'fs';
import * as path from 'path';
import type { LoggerConfig, LoggerPlugin } from '../../types';
import { PluginLoader } from '../PluginLoader';
import { config } from '../../config';
import { CoreLogger } from '../../logger';

class FileLoggerPlugin implements LoggerPlugin {
  type = 'logger' as const;
  name = 'file'; // Matches the type in config.type
  routes = [];
  private loggerInstance: CoreLogger = CoreLogger.getInstance();
  methods = {
    log: (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: any, // Accepts any type for the message
      context: any, // Optional context parameter
      config: LoggerConfig
    ): void => {
      // Format the log message
      const timestamp = new Date().toISOString();
      const logLevel = level.toUpperCase().padEnd(5); // Ensure consistent spacing for log levels

      // Handle Error objects in the message
      const formattedMessage = this.loggerInstance.formatMessage(message);

      // Format the log entry
      let logEntry = `[${timestamp}] ${logLevel} - ${formattedMessage}`;

      // Append context if provided
      if (context) {
        const formattedContext = this.loggerInstance.formatMessage(context);
        logEntry += `\nContext: ${formattedContext}`;
      }

      // Append a newline at the end
      logEntry += '\n';

      // Write the log entry to the file
      fs.appendFileSync(config.filePath, logEntry);
    },
  };
  private filePath: string;

  constructor() {
    this.filePath = config.get('logger')?.filePath || './logs/app.log';
    this.setupFileLogging();
  }

  private setupFileLogging(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export default PluginLoader.registerPlugin(new FileLoggerPlugin());
