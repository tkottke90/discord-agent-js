import { Console } from "node:console";

export class Logger extends Console {
  constructor(private name: string = '') {
    super(
      process.stdout,
      process.stderr,
      false
    );
  }

  info(message?: unknown, ...optionalParams: unknown[]) {
    this.call('info', message, ...optionalParams);
  }

  log(message?: unknown, ...optionalParams: unknown[]) {
    this.call('log', message, ...optionalParams);
  }

  warn(message?: unknown, ...optionalParams: unknown[]) {
    this.call('warn', message, ...optionalParams);
  }

  error(message?: unknown, ...optionalParams: unknown[]) {
    this.call('error', message, ...optionalParams);
  }

  debug(message?: unknown, ...optionalParams: unknown[]) {
    this.call('debug', message, ...optionalParams);
  }

  private call(
    method: keyof Pick<Console, 'info' | 'log' | 'warn' | 'error' | 'debug'>,
    message: unknown,
    ...optionalParams: unknown[]
  ) {
    const logWithLabel = this.addTag(this.name, message);
    const logWithLevel = this.addTag(method.toUpperCase(), logWithLabel);
    const logWithTimestamp = this.addTag(new Date().toISOString(), logWithLevel);

    super[method](
      logWithTimestamp, 
      ...optionalParams
    );
  }

  private addTag(name: string, message: unknown) {
    if (this.name) {
      return `[${name}] ${message}`;
    }
    return message;
  }
}