import fs from 'fs';
import { join } from 'path';

/**
 * The MiddlewareLoader class is responsible for loading middlewares
 * from the project and registered plugins.
 */
export class MiddlewareLoader {
  private static packageRoot = join(__dirname, '../..');

  /**
   * Loads middlewares from the project and registered plugins.
   */
  static async loadMiddlewaresFromDirectoy(): Promise<void> {
    // /**
    //  * Load package middlewares (silently skip if directory doesn't exist)
    //  */
    const packageMiddlewarePath = join(this.packageRoot, 'core/middlewares');
    if (fs.existsSync(packageMiddlewarePath)) {
      await this.loadMiddlewaresFromPath(packageMiddlewarePath);
    }

    /**
     * Load project middlewares (log warning if directory doesn't exist)
     */
    const projectMiddlewarePath = join(process.cwd(), 'src/middlewares');
    if (fs.existsSync(projectMiddlewarePath)) {
      await this.loadMiddlewaresFromPath(projectMiddlewarePath);
    } else {
      console.log(
        'No middlewares directory found in project. Create src/middlewares to add custom middlewares.'
      );
    }
  }

  /**
   * Loads middlewares from a given path.
   * @param basePath
   */
  private static async loadMiddlewaresFromPath(
    basePath: string
  ): Promise<void> {
    const loadMiddlewaresRec = async (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await loadMiddlewaresRec(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            await import(fullPath);
          } catch (error) {
            console.error(`Failed to load middlewares from ${file}:`, error);
          }
        }
      }
    };

    await loadMiddlewaresRec(basePath);
  }
}
