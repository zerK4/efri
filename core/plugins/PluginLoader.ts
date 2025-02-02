import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import type { ICorePlugin } from '../types/plugin';
import { ConfigLoader } from '../config';

const app = await ConfigLoader.getConfig('app');

/**
 * The PluginLoader class is responsible for discovering and registering plugins.
 */
export class PluginLoader {
  private static instance: PluginLoader;
  public static plugins: ICorePlugin[] = [];

  /**
   * @param plugin The plugin to register
   */
  static registerPlugin(plugin: ICorePlugin) {
    this.plugins.push(plugin);
  }

  /**
   * @returns The singleton instance of the PluginLoader class
   */
  public static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /**
   * Discover plugins in the src/plugins directory
   */
  static async discoverPlugins() {
    const basePath = process.cwd();
    const pluginsDir = join(
      basePath,
      (app && app['env'] === 'production') ||
        process.env.NODE_ENV === 'production'
        ? 'dist/plugins'
        : 'src/plugins'
    );
    let files: string[];

    /**
     * Recursively find all .ts files in the plugins directory and subdirectories
     */
    const getFilesRecursively = async (dir: string): Promise<string[]> => {
      let result: string[] = [];
      const list = await readdir(dir, { withFileTypes: true });

      for (const direct of list) {
        const fullPath = join(dir, direct.name);

        if (direct.isDirectory()) {
          result = [...result, ...(await getFilesRecursively(fullPath))];
        } else if (
          extname(direct.name) === '.ts' ||
          extname(direct.name) === '.tsx'
        ) {
          result.push(fullPath);
        }
      }
      return result;
    };

    try {
      files = await getFilesRecursively(pluginsDir);
    } catch (err) {
      console.warn(`Plugins directory not found at ${pluginsDir}`);
      return;
    }

    /**
     * Register the plugins
     */
    for (const file of files) {
      const pluginPath = `file://${file}`;
      try {
        const pluginModule = await import(pluginPath);
        const plugin = pluginModule.default;

        this.registerPlugin({
          type: plugin?.type,
          name: plugin?.name,
          routes: await plugin?.routes,
          init: plugin?.init,
          methods: plugin?.methods,
        });
      } catch (err) {
        console.error(`Failed to import plugin from ${file}:`, err);
      }
    }
  }
}
