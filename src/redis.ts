import redis from 'redis';
import ConfigurationFile from 'config';
import { Logger } from './utils/logging.js';
import { RedisConfig } from './interfaces/config.js';

let client: ReturnType<typeof createRedisInstance>;
const logger = new Logger('Redis');

export function createRedisInstance(config: RedisConfig, log: Logger) {
  const domain = config.location.startsWith('redis://')
    ? config.location.split('://')[1]
    : config.location;
  
  const url = [
    'redis://',
    config.username ?? '',
    config.username ? ':' : '',
    config.password ?? '',
    domain
  ].join('')

  log.debug(`Connecting to ${url}`);

  return redis.createClient({
    url,
  });
}

export async function initialize() {
  logger.debug('Initializing Redis...');
  const config = ConfigurationFile.get<RedisConfig>('cache');
  
  client = createRedisInstance(config, logger);

  client.on('error', err => logger.error('Redis Error', err));

  await client.connect();

  if (client.isReady) {
    logger.info('Connected to Redis');
  } else {
    logger.error('Failed to connect to Redis');
  }
}

export async function clone() {
  logger.debug('Cloning Redis client...');
  const clonedClient = await client.duplicate();

  await clonedClient.connect();

  return clonedClient;
}
