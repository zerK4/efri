import RouteLoader from '../router/RouteLoader';
import chalk from 'chalk';
import type { HttpMethod } from '../types/router';
import { Command } from '../cli/Command';
import type { RouteInfo } from '../types/routes';
import path from 'path';
import { PluginLoader } from '../plugins/PluginLoader';
import { MiddlewareLoader } from '../middlewares/MiddlewareLoader';

export default class ListRoutes extends Command {
  name = 'routes:list';
  description = 'List all registered routes';
  dependencies = [];

  private isPluginRoute(route: RouteInfo): boolean {
    return route.file?.includes(path.join('src', 'plugins')) || false;
  }

  private getPluginName(route: RouteInfo): string {
    if (!route.file) return 'unknown';
    // Extract plugin name from the file path
    // e.g., src/plugins/dynamic.ts -> dynamic
    const matches = route.file.match(/src\/plugins\/([^/]+)/);
    return matches ? matches[1].replace('.ts', '') : 'unknown';
  }

  private groupRoutesByPlugin(
    pluginRoutes: RouteInfo[]
  ): Record<string, RouteInfo[]> {
    return pluginRoutes.reduce(
      (acc, route) => {
        const pluginName = this.getPluginName(route);
        if (!acc[pluginName]) {
          acc[pluginName] = [];
        }
        acc[pluginName].push(route);
        return acc;
      },
      {} as Record<string, RouteInfo[]>
    );
  }

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    await MiddlewareLoader.loadMiddlewaresFromDirectoy();
    await PluginLoader.discoverPlugins();
    const routes = await RouteLoader.loadRoutesFromDirectory(true);

    if (context.options['export']) {
      if (context.options['json']) {
        console.log(JSON.stringify(routes, null, 2));
        return;
      }

      console.log(
        routes.map((route) => `${route.method}: ${route.path}`).join('\n')
      );
      return;
    }

    const pluginRoutes = routes.filter((route) => this.isPluginRoute(route));
    const standardRoutes = routes.filter((route) => !this.isPluginRoute(route));

    console.log(chalk.blue('\n📍 Application Routes:\n'));

    const methodColors: Record<HttpMethod, (text: string) => string> = {
      GET: chalk.green,
      POST: chalk.blue,
      PUT: chalk.yellow,
      DELETE: chalk.red,
      PATCH: chalk.magenta,
    };

    // Print standard routes
    let currentFile: string | undefined = '';
    const sortedStandardRoutes = standardRoutes.sort(
      (a, b) =>
        a?.file?.localeCompare(b?.file ?? '') || a?.path?.localeCompare(b.path)
    );

    sortedStandardRoutes.forEach((route, index) => {
      if (route.file !== currentFile) {
        // Add spacing between file groups
        if (index > 0) {
          console.log('');
        }
        console.log(chalk.yellow(`  File: ${route.file}\n`));
        currentFile = route.file;
      }

      const color = methodColors[route.method as HttpMethod];
      console.log(
        `    ${color('▸')} ${route.method.padEnd(6)} ${chalk.dim(route.path)}` +
          chalk.gray(` (line: ${route.line})`) +
          (route.middleware?.length
            ? chalk.gray(` [Middleware: ${route.middleware.join(', ')}]`)
            : '')
      );
    });

    // Print plugin routes if they exist
    if (pluginRoutes.length > 0) {
      console.log(chalk.blue('\n📦 Plugin Routes:\n'));

      const pluginGroups = this.groupRoutesByPlugin(pluginRoutes);

      Object.entries(pluginGroups).forEach(([pluginName, routes], index) => {
        // Add spacing between plugin groups
        if (index > 0) {
          console.log('');
        }
        console.log(chalk.magenta(`  Plugin: ${pluginName}`));

        routes.forEach((route) => {
          const color = methodColors[route.method as HttpMethod];
          console.log(
            `    ${color('▸')} ${route.method.padEnd(6)} ${chalk.dim(route.path)}` +
              (route.middleware?.length
                ? chalk.gray(` [Middleware: ${route.middleware.join(', ')}]`)
                : '')
          );
        });
      });
    }

    // Print total routes count
    console.log(
      chalk.dim(
        `\n  Total Routes: ${routes.length} ` +
          `(${standardRoutes.length} application, ${pluginRoutes.length} plugin)`
      )
    );
  }
}
