import pino from 'pino';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { ConfigLoader } from '../config/config/ConfigLoader';
import type { LoggerConfig } from '../types/logger';

let loggerConfig = await ConfigLoader?.getConfig('logger');

if (!loggerConfig) {
  loggerConfig = {
    level: 'info',
    prettyPrint: true,
    filePath: './logs/app.log',
  } satisfies LoggerConfig;
}

const transports = [];
const logFilePath = loggerConfig.filePath;

// Extract the directory part from the file path
const logDir = dirname(logFilePath);

// Ensure the directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Ensure the log file exists
if (!existsSync(logFilePath)) {
  writeFileSync(logFilePath, ''); // Create an empty file
}

// Add a file transport if a file path is configured
if (loggerConfig.filePath) {
  transports.push(
    pino.transport({
      target: 'pino/file',
      options: { destination: loggerConfig.filePath },
    })
  );
}

// Add pretty-print for development if enabled
if (loggerConfig.prettyPrint) {
  transports.push(
    pino.transport({
      target: 'pino-pretty',
      options: { colorize: true },
    })
  );
}

export const logger = pino(
  {
    level: loggerConfig.level,
  },
  pino.multistream(transports)
);
