import Bun from 'bun';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { CommandLoader } from './cli/CommandLoader';
import { app } from './config/app';
import { ConfigLoader } from './config/config/ConfigLoader';
import { GateLoader } from './gates';
import { MiddlewareLoader } from './middlewares/MiddlewareLoader';
import { loadModels } from './models/modelRegistrar';
import { PluginLoader } from './plugins/PluginLoader';
import RouteLoader from './router/RouteLoader';
import { Router } from './router/Router';
import { ValidatorLoader } from './validators/ValidatorLoader';

export class Application {
  private static instance: Application;
  private router: Router;
  private maxPortAttempts = 10;

  private constructor() {
    this.router = Router.getInstance();
    dotenv.config();
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  public getRouter(): Router {
    return this.router;
  }

  private async initialize() {
    RouteLoader.loadRoutesFromDirectory();
    CommandLoader.loadCommands();
    MiddlewareLoader.loadMiddlewaresFromDirectoy();
    PluginLoader.discoverPlugins();
    await ConfigLoader.loadConfigsFromDirectoy();
    GateLoader.loadGatesFromDirectory();
    ValidatorLoader.loadValidatorsFromDirectory();
    loadModels();
  }

  private async tryServe(port: number): Promise<void> {
    try {
      Bun.serve({
        port,
        fetch: (req) => this.router.handleRequest(req),
        error: (err) => {
          console.error(err);
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
      console.error(error);
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

    console.error(
      `${chalk.red('✖')} Failed to find an available port after ${this.maxPortAttempts} attempts`
    );
    process.exit(1);
  }
}
