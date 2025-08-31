import { type Response } from 'express';
import { type Logger } from '../utils/logging.js';

export interface HttpResponse extends Response {
  locals: {
    logger: Logger;
  };
}