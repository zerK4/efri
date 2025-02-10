import { watch } from 'fs';
import type { FSWatcher } from 'fs';
import { ConfigLoader } from './config/config/ConfigLoader';
import { CommandLoader } from './cli/CommandLoader';
import { PluginLoader } from './plugins/PluginLoader';
import { GateLoader } from './gates/GateLoader';
import { ValidatorLoader } from './validators/ValidatorLoader';
import { MiddlewareLoader } from './middlewares/MiddlewareLoader';
import path from 'path';
import { logger } from './logger';

interface WatchConfig {
  path: string;
  loader: () => Promise<void>;
}

export class FileWatchManager {
  private static watchers: FSWatcher[] = [];
  private static isInitialized = false;

  private static watchConfigs: WatchConfig[] = [
    {
      path: 'src/middlewares',
      loader: async () => MiddlewareLoader.loadMiddlewaresFromDirectoy(),
    },
    {
      path: 'src/gates',
      loader: () => GateLoader.loadGatesFromDirectory(),
    },
    {
      path: 'src/validators',
      loader: () => ValidatorLoader.loadValidatorsFromDirectory(),
    },
  ];

  static async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Initial load of all components
    await this.loadAll();

    // Set up global watcher
    this.setupWatcher();

    this.isInitialized = true;
  }

  private static async loadAll() {
    console.log('Loading all components...');
    await ConfigLoader.loadConfigsFromDirectoy();
    await CommandLoader.loadCommands();
    await PluginLoader.discoverPlugins();

    // Load all watched components
    for (const config of this.watchConfigs) {
      await config.loader();
    }
  }

  private static setupWatcher() {
    try {
      const watcher = watch(
        '../../',
        { recursive: true },
        async (eventType, filename) => {
          if (!filename) return;

          const filePath = path.normalize(filename);
          for (const config of this.watchConfigs) {
            if (filePath.startsWith(path.normalize(config.path))) {
              console.log(`Changes detected in ${config.path}/${filename}`);
              await config.loader();
              break;
            }
          }
        }
      );

      this.watchers.push(watcher);
      console.log(
        `Watching entire project, but only reloading specific paths.`
      );
    } catch (error) {
      logger.error('Failed to set up watcher:', error);
    }
  }

  static cleanup() {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
    this.isInitialized = false;
  }
}

// Export a simplified interface for the application
export const efri = {
  async init() {
    await FileWatchManager.initialize();
  },

  cleanup() {
    FileWatchManager.cleanup();
  },
};
