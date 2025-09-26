interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  environment?: string;
  [key: string]: unknown;
}

export class LambdaLogger {
  private requestId?: string;
  private environment?: string;

  constructor(requestId?: string, environment?: string) {
    this.requestId = requestId;
    this.environment = environment;
  }

  private log(level: string, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      environment: this.environment,
      ...metadata,
    };

    console.log(JSON.stringify(entry));
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.log('ERROR', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('DEBUG', message, metadata);
  }
}

export function createLogger(requestId?: string, environment?: string): LambdaLogger {
  return new LambdaLogger(requestId, environment);
}