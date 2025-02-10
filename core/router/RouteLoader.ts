import { Router } from './Router';
import { relative, join } from 'path';
import fs from 'fs';
import type { RouteInfo } from '../types/routes';
import { PluginLoader } from '../plugins/PluginLoader';
import type { HttpMethod } from '../types';
import { config } from '../config';
import { logger } from '../logger';

const app = config.get('app');

export default class RouteLoader {
  private static packageRoot = join(__dirname, '../..');

  static async loadRoutesFromDirectory(
    withSourceInfo = false
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const plugins = PluginLoader.plugins;

    // Load routes from the route plugin
    const routePlugin = plugins?.find(
      (plugin) => plugin.type === 'route-plugin'
    );
    if (routePlugin?.routes) {
      try {
        const processedPluginRoutes = withSourceInfo
          ? routePlugin.routes.map((route) => ({
              ...route,
              file: route.file || `plugin:${routePlugin.name}`,
              line: route.line || 0,
              method: route.method,
              path: route.path,
              middleware: route.middleware || [],
            }))
          : routePlugin.routes;

        processedPluginRoutes.forEach((route) => {
          if (!Router.has(route.path)) {
            Router.addRoute(
              route.method,
              route.path,
              route.handler,
              route.middleware
            );
          }
        });

        routes.push(...processedPluginRoutes);
      } catch (error) {
        logger.error(
          `Failed to load routes from plugin ${routePlugin.name}:`,
          error
        );
      }
    }

    // Load package routes
    const packageRoutesPath = join(this.packageRoot, 'core/routes');
    if (fs.existsSync(packageRoutesPath)) {
      const packageRoutes = await this.loadRoutesFromPath(
        packageRoutesPath,
        withSourceInfo
      );
      routes.push(...packageRoutes);
    }

    // Load production routes if in production
    const prodRoutesPath = join(process.cwd(), 'dist/routes');
    if (
      (fs.existsSync(prodRoutesPath) &&
        process.env.NODE_ENV === 'production') ||
      (app && app['env'] === 'production')
    ) {
      const prodRoutes = await this.loadRoutesFromPath(
        prodRoutesPath,
        withSourceInfo
      );
      routes.push(...prodRoutes);
    }

    // Load project routes
    const projectRoutesPath = join(process.cwd(), 'src/routes');
    if (fs.existsSync(projectRoutesPath)) {
      const projectRoutes = await this.loadRoutesFromPath(
        projectRoutesPath,
        withSourceInfo
      );
      routes.push(...projectRoutes);
    } else {
      console.log(
        'No routes directory found in project. Create src/routes to add custom routes.'
      );
    }

    return routes;
  }

  private static async loadRoutesFromPath(
    basePath: string,
    withSourceInfo: boolean
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    const loadRoutesRecursively = async (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await loadRoutesRecursively(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            if (withSourceInfo) {
              const sourceCode = fs.readFileSync(fullPath, 'utf-8');
              const fileRoutes = await this.extractRoutesFromSource(
                sourceCode,
                fullPath
              );
              routes.push(...fileRoutes);
            }

            await import(fullPath);
          } catch (error) {
            logger.error(`Failed to load routes from ${file}:`, error);
          }
        }
      }
    };

    await loadRoutesRecursively(basePath);
    return routes;
  }

  static async extractRoutesFromSource(
    sourceCode: string,
    filePath: string
  ): Promise<RouteInfo[]> {
    const extractedRoutes: RouteInfo[] = [];
    const router = Router.getInstance();

    const originalMethods = ['get', 'post', 'put', 'delete', 'patch'];
    const methodBackups = originalMethods.map(
      (method) => router[method as keyof typeof router]
    );

    // Override router methods to capture route information
    originalMethods.forEach((method) => {
      const originalMethod = router[method as keyof typeof router];

      router[method as keyof Router] = ((...args: any[]) => {
        if (typeof args[0] === 'string') {
          const [path, , middleware = []] = args;

          // Apply group prefixes and middleware
          const fullPrefix = router['groupStack']
            .map((group) => group.prefix || '')
            .filter(Boolean)
            .join('');

          const fullPath = `${fullPrefix}${path}`;

          const allMiddleware = [
            ...middleware,
            ...router['groupStack'].flatMap((group) => group.middleware || []),
          ];

          const lines = sourceCode
            .substring(0, sourceCode.indexOf(path))
            .split('\n');

          extractedRoutes.push({
            method: method.toUpperCase() as HttpMethod,
            path: fullPath,
            file: relative(process.cwd(), filePath),
            line: lines.length,
            middleware: allMiddleware,
          });
        }
        return (originalMethod as any).apply(router, args);
      }) as any;
    });

    // Import the file to trigger route registration
    await import(filePath);

    // Restore original router methods
    originalMethods.forEach((method, index) => {
      (router as any)[method] = methodBackups[index];
    });

    return extractedRoutes;
  }
}
