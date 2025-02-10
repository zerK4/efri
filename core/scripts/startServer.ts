import { Efri } from '..';

async function startApplication() {
  try {
    Efri.getInstance().serve();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

startApplication();
