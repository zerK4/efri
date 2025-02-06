import { CoreLogger } from '../../logger';
import type { LoggerConfig, LogLevel } from '../../types';
import { PluginLoader } from '../PluginLoader';

export default PluginLoader.registerPlugin({
  type: 'logger',
  name: 'console',
  routes: [],
  methods: {
    log: (
      level: LogLevel,
      message: any,
      context: any,
      config: LoggerConfig
    ): void => {
      const loggerInstance = CoreLogger.getInstance();
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        reset: '\x1b[0m', // Reset color
      };

      if (typeof message !== 'string') {
        message = loggerInstance.formatMessage(message);
      }

      const logMessage = config.prettyPrint
        ? `${colors[level]}[${level.toUpperCase()}]${colors.reset} ${new Date().toISOString()} - ${message}`
        : message;
      console.log(logMessage);

      if (context) {
        const fContext = loggerInstance.formatMessage(context);
        console.log('Context:', fContext);
      }
    },
  },
});
