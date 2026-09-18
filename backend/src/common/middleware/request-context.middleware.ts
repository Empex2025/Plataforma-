import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { metricsRegistry } from '@/common/metrics/metrics.registry.js';
import { runWithRequestContext } from '@/common/context/request-context.store.js';

const logger = new Logger('HTTP');

const MAX_REQUEST_ID_LENGTH = 128;
const HEADER = 'x-request-id';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[HEADER];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length <= MAX_REQUEST_ID_LENGTH
      ? incoming
      : randomUUID();

  res.setHeader(HEADER, requestId);
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms requestId=${requestId}`);
    metricsRegistry.recordHttp(req.method, res.statusCode, duration);
  });

  runWithRequestContext({ membershipCache: new Map() }, () => next());
}
