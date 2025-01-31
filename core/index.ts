import { Router } from './router/Router';
import chalk from 'chalk';
import RouteLoader from './router/RouteLoader';
import { app } from './config/app';
import Bun from 'bun';
import dotenv from 'dotenv';
import { loadModels } from './models/modelRegistrar';

export class Application {
  private static instance: Application;
  private router: Router;

  private constructor() {
    this.router = Router.getInstance();
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }

    dotenv.config();

    return Application.instance;
  }

  public getRouter(): Router {
    return this.router;
  }

  public async serve() {
    RouteLoader.loadRoutesFromDirectory();
    loadModels();
    const port = app.port ?? 3000;

    Bun.serve({
      port,
      fetch: (req) => this.router.handleRequest(req),
    });

    console.log(
      `${chalk.greenBright('✔')} ${chalk.bold('Server started successfully!')}`
    );

    console.log(
      `${chalk.cyan('🌐')} ${chalk.dim(
        'Running at:'
      )} ${chalk.underline.blueBright(`http://localhost:${port}`)}`
    );
    console.log(
      `${chalk.yellow('🚀')} ${chalk.dim('Ready to handle requests!')}`
    );
  }
}
