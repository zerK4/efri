import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import type { ICorePlugin } from '../types/plugin';
import { config } from '../config';
import fs from 'fs';

const app = config.get('app');

/**
 * The PluginLoader class is responsible for discovering and registering plugins.
 */
export class PluginLoader {
  private static instance: PluginLoader;
  public static plugins: ICorePlugin[] = [];
  private static packageRoot = join(__dirname, '../..'); // Path to the package root

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
   * Discover plugins in both the package and project directories.
   */
  static async discoverPlugins() {
    /**
     * Load package plugins (silently skip if directory doesn't exist)
     */
    const packagePluginsDir = join(this.packageRoot, 'core/plugins/logger');
    if (await this.directoryExists(packagePluginsDir)) {
      await this.loadPluginsFromPath(packagePluginsDir);
    }

    /**
     * Load project plugins (log warning if directory doesn't exist)
     */
    const projectPluginsDir = join(
      process.cwd(),
      (app && app['env'] === 'production') ||
        process.env.NODE_ENV === 'production'
        ? 'dist/plugins'
        : 'src/plugins'
    );
    if (await this.directoryExists(projectPluginsDir)) {
      await this.loadPluginsFromPath(projectPluginsDir);
    } else {
      console.warn(
        `No plugins directory found in project. Create ${projectPluginsDir} to add custom plugins.`
      );
    }
  }

  /**
   * Check if a directory exists.
   * @param dir The directory path to check.
   * @returns A boolean indicating whether the directory exists.
   */
  private static async directoryExists(dir: string): Promise<boolean> {
    try {
      await fs.promises.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load plugins from a given directory path.
   * @param basePath The base directory path to load plugins from.
   */
  private static async loadPluginsFromPath(basePath: string): Promise<void> {
    const loadPluginsRec = async (dir: string) => {
      const files = await readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = join(dir, file.name);

        if (file.isDirectory()) {
          await loadPluginsRec(fullPath); // Recursively load plugins from subdirectories
        } else if (
          extname(file.name) === '.ts' ||
          extname(file.name) === '.tsx'
        ) {
          try {
            const pluginPath = `file://${fullPath}`;
            await import(pluginPath);
          } catch (err) {
            console.error(`Failed to import plugin from ${fullPath}:`, err);
          }
        }
      }
    };

    await loadPluginsRec(basePath);
  }
}
