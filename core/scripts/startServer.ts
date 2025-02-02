import { $ } from 'bun';
import RouteLoader from '../router/RouteLoader';
import { Router } from '../router';
import { PluginLoader } from '../plugins/PluginLoader';
import chalk from 'chalk';

/**
 * Load routes dynamically and start the application.
 */
async function startApplication() {
  try {
    console.log(chalk.green('Loading routes...'));
    await PluginLoader.discoverPlugins();
    await RouteLoader.loadRoutesFromDirectory(true);
    console.log(chalk.green('Routes loaded successfully!'));

    console.log(chalk.green('Starting application...'));
    await $`bun run start:vite`;

    console.log('Application started successfully!');
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

startApplication();
