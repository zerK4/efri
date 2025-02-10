import Bun from 'bun';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { CommandLoader } from './cli/CommandLoader';
import { app } from './config/app';
import { ConfigLoader } from './config/config/ConfigLoader';
import { GateLoader } from './gates';
import { MiddlewareLoader } from './middlewares/middlewareLoader';
import { loadModels } from './models/modelRegistrar';
import { PluginLoader } from './plugins/PluginLoader';
import RouteLoader from './router/RouteLoader';
import { Router } from './router/Router';
import { ValidatorLoader } from './validators/ValidatorLoader';
import { CoreError } from './errors/CoreError';
import { logger } from './logger';

export class Efri {
  private static instance: Efri;
  private router: Router;
  private maxPortAttempts = 10;

  private constructor() {
    this.router = Router.getInstance();
    dotenv.config();
  }

  public static getInstance(): Efri {
    if (!Efri.instance) {
      Efri.instance = new Efri();
    }
    return Efri.instance;
  }

  public getRouter(): Router {
    return this.router;
  }

  private async initialize(): Promise<void> {
    try {
      // Step 1: Load configurations
      await this.safeLoad(
        () => ConfigLoader.loadConfigsFromDirectoy(),
        'ConfigLoader'
      );

      // Step 2: Load middlewares
      await this.safeLoad(
        () => MiddlewareLoader.loadMiddlewaresFromDirectoy(),
        'MiddlewareLoader'
      );

      // Step 3: Load routes
      await this.safeLoad(
        () => RouteLoader.loadRoutesFromDirectory(),
        'RouteLoader'
      );

      // Step 4: Load other components
      await Promise.all([
        this.safeLoad(() => PluginLoader.discoverPlugins(), 'PluginLoader'),
        this.safeLoad(() => CommandLoader.loadCommands(), 'CommandLoader'),
        this.safeLoad(() => GateLoader.loadGatesFromDirectory(), 'GateLoader'),
        this.safeLoad(
          () => ValidatorLoader.loadValidatorsFromDirectory(),
          'ValidatorLoader'
        ),
        this.safeLoad(() => loadModels(), 'loadModels'),
      ]);
      console.log(
        chalk.greenBright('✔︎'),
        'All components loaded successfully.'
      );
      console.log(chalk.dim('-------------------------------------'));
    } catch (error) {
      logger.error('Initialization failed:', error);
      throw new CoreError({
        message: 'Initialization failed',
      });
    }
  }

  /**
   * Helper function to safely execute a loading function and log errors.
   * @param loaderFunction The function to execute.
   * @param loaderName The name of the loader (for logging purposes).
   */
  private async safeLoad<T>(
    loaderFunction: () => Promise<T> | T,
    loaderName: string
  ): Promise<void> {
    try {
      await loaderFunction();
    } catch (error) {
      logger.error(`${loaderName} failed to load:`, error);
      throw error; // Rethrow to stop the initialization process
    }
  }

  private async tryServe(port: number): Promise<void> {
    try {
      Bun.serve({
        port,
        fetch: (req, server) => this.router.handleRequest(req, server),
        error: (err) => {
          logger.error(err);
          return new Response(err.message, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          });
        },
      });

      console.log(
        `${chalk.greenBright('✔')} ${chalk.bold('Server started successfully!')}`
      );
      console.log(
        `${chalk.cyan('🌐')} ${chalk.dim('Running at:')} ${chalk.underline.blueBright(`http://localhost:${port}`)}`
      );
      console.log(
        `${chalk.yellow('🚀')} ${chalk.dim('Ready to handle requests!')}`
      );
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        throw error;
      }
      logger.error(error);
      process.exit(1);
    }
  }

  public async serve() {
    await this.initialize();
    let port = app.port ?? 3000;

    for (let attempt = 0; attempt < this.maxPortAttempts; attempt++) {
      try {
        await this.tryServe(port);
        return;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          console.log(
            `${chalk.yellow('⚠')} Port ${port} is in use, trying ${port + 1}...`
          );
          port++;
          continue;
        }
        throw error;
      }
    }

    logger.error(
      `${chalk.red('✖')} Failed to find an available port after ${this.maxPortAttempts} attempts`
    );
    process.exit(1);
  }
}
