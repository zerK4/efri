import type { ICorePlugin } from './plugin';

export interface LoggerConfig {
  type?: Array<'console' | 'file' | 'json'>;
  level: LogLevel;
  prettyPrint: boolean;
  filePath: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerPlugin extends ICorePlugin {
  type: 'logger';
  methods: {
    log: (
      level: LogLevel,
      message: any,
      context: any,
      config: LoggerConfig
    ) => void;
  };
}
