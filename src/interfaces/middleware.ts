import { type Response } from 'express';
import { type Logger } from '../utils/logging';

export interface HttpResponse extends Response {
  locals: {
    logger: Logger;
  };
}