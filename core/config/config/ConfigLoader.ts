import fs from 'fs';
import { join } from 'path';
import { config } from './CoreConfig';
import { logger } from '../../logger';

/**
 * The ConfigLoader class is responsible for loading gates
 * from the project and registered plugins.
 */
export class ConfigLoader {
  private static packageRoot = join(__dirname, '../..');

  /**
   * Loads Configs from the project and registered plugins.
   */
  static async loadConfigsFromDirectoy(): Promise<void> {
    const packageConfigPath = join(this.packageRoot, 'core/config/configs');
    if (fs.existsSync(packageConfigPath)) {
      await this.loadConfigsFromPath(packageConfigPath);
    }

    const projectConfigPath = join(process.cwd(), 'src/config');
    if (fs.existsSync(projectConfigPath)) {
      await this.loadConfigsFromPath(projectConfigPath);
    } else {
      console.log(
        'No configs directory found in project. Create src/config to add custom configs.'
      );
    }
  }

  /**
   * Loads configs from a given path.
   * @param basePath
   */
  private static async loadConfigsFromPath(basePath: string): Promise<void> {
    const loadConfigsRec = async (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await loadConfigsRec(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            const imported = await import(fullPath);

            // If the module exports a default config function, execute it
            if (typeof imported.default === 'function') {
              await imported.default();
            }

            // If the module exports a config object directly, use it
            if (imported.config && !imported.default) {
              const configName = file.replace(/\.(ts|js)$/, '');
              config.defineConfig(configName, imported.config);
            }
          } catch (error) {
            logger.error(`Failed to load config from ${file}:`, error);
            logger.error(error);
          }
        }
      }
    };

    await loadConfigsRec(basePath);
  }
}
