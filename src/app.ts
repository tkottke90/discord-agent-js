import {AppConfigSchema, type AppConfig } from './interfaces/app';
import express from 'express';
import controllers from './controllers';
import { HttpEventMiddleware } from './middleware/http-log.middleware';
import createDiscordBot from './discord';

export default function App(options: Partial<AppConfig> = {}, callback?: (app: express.Application, options: AppConfig) => void) {
  // Normalize Options
  const normalizedOptions: AppConfig = AppConfigSchema.parse(options);

  // Create Express App
  const app = express();

  // Setup Global Middleware

  app.use(HttpEventMiddleware);

  // Setup Controllers
  controllers(app);

  app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hello World!' });
  });

  // Start Discord Bot
  createDiscordBot();

  app.listen(normalizedOptions.port, normalizedOptions.host, () => {
    if (callback) {
      callback(app, normalizedOptions);
    } else {
      console.log(`Server listening on http://${normalizedOptions.host}:${normalizedOptions.port}`);
    }
  });
}