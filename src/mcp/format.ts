import { logger } from '../logger.js';

export function formatSuccess(data: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function formatError(error: unknown): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof Error) {
    logger.error('Tool error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.error('Unknown tool error', { error });
  }

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
  };
}
