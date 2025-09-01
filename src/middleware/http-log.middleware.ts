import express from 'express';
import { Logger } from '../utils/logging.js';
import { NS_PER_SEC, NS_TO_MS } from '../constants.js';
import crypto from 'crypto';

export function HttpEventMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const traceId = crypto.randomUUID();
  const start = process.hrtime();
  const logger = new Logger(`HTTP-REQ-${traceId}`);

  res.locals.logger = logger;

  res.on('close', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;

    logger.info(
      `${req.method} ${req.originalUrl} [${duration.toFixed(2)} ms]`,
      {
        method: req.method,
        url: req.url,
        timingMS: duration,
        status: res.statusCode,
      },
    );
  });

  next();
}
