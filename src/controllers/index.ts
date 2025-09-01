import { Application, Router } from 'express';
import { Logger } from '../utils/logging.js';

import Chat from './v1/chat/index.js';

const controllers: [path: string, controller: () => Router][] = [
  ['/v1/chat', Chat],
];

export default async function (app: Application) {
  const logger = new Logger('Controllers');

  logger.debug('Loading controllers...');

  controllers.forEach(([path, controller]) => {
    logger.debug('  Mounting: ' + path + '...');
    app.use(path, controller());
  });

  app.use('/healthcheck', (req, res) => {
    res.status(200).json({ message: 'OK' });
  });

  logger.info('Controllers loaded successfully');
}
