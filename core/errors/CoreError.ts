import { logger } from '../logger';

export class CoreError extends Error {
  public readonly name: string = 'CoreError';
  public readonly httpCode: number;
  public readonly code: string;
  public readonly details?: string;
  public readonly timestamp: string;
  public readonly path: string;
  public readonly method: string;
  public readonly stack: string = '';
  public readonly filePath: string;
  public readonly lineNumber?: number;
  public readonly columnNumber?: number;

  constructor({
    message,
    httpCode = 500,
    code = 'UNKNOWN_ERROR',
    details,
    path = '',
    method = '',
    cause,
  }: {
    message: string;
    httpCode?: number;
    code?: string;
    details?: string;
    path?: string;
    method?: string;
    cause?: Error;
  }) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace(this, this.constructor);

    this.httpCode = httpCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.method = method;

    const stackLines = this.stack?.split('\n') || [];
    const errorLine = stackLines[1]; // First line after error message

    const stackInfo =
      errorLine?.match(/at.+\((.+):(\d+):(\d+)\)/) ||
      errorLine?.match(/at\s+(.+):(\d+):(\d+)/);

    if (stackInfo) {
      this.filePath = stackInfo[1]; // Full file path
      this.lineNumber = parseInt(stackInfo[2], 10);
      this.columnNumber = parseInt(stackInfo[3], 10);
    } else {
      this.filePath = 'unknown';
    }

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }

    logger.log('error', this);
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      httpCode: this.httpCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      method: this.method,
      filePath: this.filePath,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
    };
  }

  public getFileName(): string {
    return this.filePath.split(/[/\\]/).pop() || 'unknown';
  }
}
