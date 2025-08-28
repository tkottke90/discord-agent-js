import createApp from './app';
import { config } from 'dotenv';

async function main() {
  config();

  createApp()
}

main();