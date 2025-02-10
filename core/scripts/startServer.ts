import { Efri } from '..';
import { logger } from '../logger';

async function startApplication() {
  try {
    Efri.getInstance().serve();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

startApplication();
