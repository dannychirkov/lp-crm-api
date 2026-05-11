type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (levels[level] < levels[currentLevel]) {
    return;
  }

  const suffix = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;
  process.stderr.write(`[${level.toUpperCase()}] ${message}${suffix}\n`);
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    write('debug', message, meta);
  },
  info(message: string, meta?: unknown): void {
    write('info', message, meta);
  },
  warn(message: string, meta?: unknown): void {
    write('warn', message, meta);
  },
  error(message: string, meta?: unknown): void {
    write('error', message, meta);
  },
};
