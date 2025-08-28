import { Application, Router } from 'express';
import { Logger } from '../utils/logging';

import Chat from './v1/chat';

const controllers: [path: string, controller: () => Router][] = [
  ['/v1/chat', Chat]
]

export default async function(app: Application) {
  const logger = new Logger();

  logger.info('Loading controllers...');
  
  controllers.forEach(([path, controller]) => {
    logger.info('  Mounting: ' + path + '...');
    app.use(path, controller());
  });

  logger.info('Controllers loaded successfully');
}