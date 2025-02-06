import { Application } from '..';

async function startApplication() {
  try {
    Application.getInstance().serve();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

startApplication();
