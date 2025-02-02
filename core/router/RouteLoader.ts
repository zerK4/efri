import { Router } from './Router';
import { relative, join } from 'path';
import fs from 'fs';
import type { RouteInfo } from '../types/routes';
import { PluginLoader } from '../plugins/PluginLoader';
import type { HttpMethod } from '../types';
import { ConfigLoader } from '../config';

const app = await ConfigLoader.getConfig('app');

/**
 * The RouteLoader class is responsible for loading routes
 * from the project and registered plugins.
 */
export default class RouteLoader {
  private static packageRoot = join(__dirname, '../..');

  /**
   * Loads routes from the project and registered plugins.
   * @param withSourceInfo
   * @returns
   */
  static async loadRoutesFromDirectory(
    withSourceInfo = false
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const plugins = PluginLoader.plugins;

    const pluginRoutes = plugins.find(
      (plugin) => plugin.type === 'route-plugin'
    )?.routes;

    /**
     * Load plugin routes
     */
    for (const plugin of PluginLoader.plugins) {
      try {
        const processedPluginRoutes = withSourceInfo
          ? pluginRoutes?.map((route) => ({
              ...route,
              file: route.file || `plugin:${plugin.name}`,
              line: route.line || 0,
              method: route.method,
              path: route.path,
              middleware: route.middleware || [],
            }))
          : pluginRoutes;

        // Register routes in the Router
        processedPluginRoutes?.forEach((route) => {
          Router.addRoute(
            route.method,
            route.path,
            route.handler,
            route.middleware
          );
        });

        if (!processedPluginRoutes) return routes;

        routes.push(...processedPluginRoutes);
      } catch (error) {
        console.error(
          `Failed to load routes from plugin ${plugin.name}:`,
          error
        );
      }
    }

    /**
     * Load package routes (silently skip if directory doesn't exist)
     */
    const packageRoutesPath = join(this.packageRoot, 'core/routes');
    if (fs.existsSync(packageRoutesPath)) {
      const packageRoutes = await this.loadRoutesFromPath(
        packageRoutesPath,
        withSourceInfo
      );
      routes.push(...packageRoutes);
    }

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

    /**
     * Load project routes (log warning if directory doesn't exist)
     */
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

  /**
   * Loads routes from a given path.
   * @param basePath
   * @param withSourceInfo
   * @returns
   */
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
            console.error(`Failed to load routes from ${file}:`, error);
          }
        }
      }
    };

    await loadRoutesRecursively(basePath);
    return routes;
  }

  /**
   * Extract routes from a given source path.
   * @param sourceCode
   * @param filePath
   * @returns
   */
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

    originalMethods.forEach((method) => {
      const originalMethod = router[method as keyof typeof router];

      router[method as keyof Router] = ((...args: any[]) => {
        if (typeof args[0] === 'string') {
          const [path, , middleware = []] = args;
          const lines = sourceCode
            .substring(0, sourceCode.indexOf(path))
            .split('\n');

          extractedRoutes.push({
            method: method.toUpperCase() as HttpMethod,
            path,
            file: relative(process.cwd(), filePath),
            line: lines.length,
            middleware,
          });
        }
        return (originalMethod as any).apply(router, args);
      }) as any;
    });

    await import(filePath);

    originalMethods.forEach((method, index) => {
      (router as any)[method] = methodBackups[index];
    });

    return extractedRoutes;
  }
}
