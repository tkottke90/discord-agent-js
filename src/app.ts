import { AppConfigSchema, type AppConfig } from './interfaces/app.js';
import express from 'express';
import controllers from './controllers/index.js';
import { HttpEventMiddleware } from './middleware/http-log.middleware.js';
import createDiscordBot from './discord/index.js';
import { Logger } from './utils/logging.js';
import ConfigurationFile from 'config';
import * as Agents from './agents/index.js';
import * as redis from './redis.js';

async function shutdown() {
  Agents.getPool().shutdown();
}

export default async function createApp(
  callback?: (app: express.Application, options: AppConfig) => void,
) {
  const logger = new Logger('Server');

  // Initialize Redis Cache
  await redis.initialize();

  // Normalize Options
  let config = {};
  if (ConfigurationFile.has('server')) {
    config = { ...ConfigurationFile.get<AppConfig>('server') };
  }

  const normalizedOptions: AppConfig = AppConfigSchema.parse(config);

  // Create Express App
  const app = express();

  // Setup Global Middleware
  app.use(HttpEventMiddleware);

  // Setup Controllers
  controllers(app);

  app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hello World!' });
  });

  // Start Agents
  Agents.initialize();

  // Start Discord Bot
  createDiscordBot();

  app.listen(normalizedOptions.port, normalizedOptions.host, () => {
    if (callback) {
      callback(app, normalizedOptions);
    } else {
      logger.info(
        `Server listening on http://${normalizedOptions.host}:${normalizedOptions.port}`,
      );
    }
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await shutdown();
    process.exit(0);
  });
}
