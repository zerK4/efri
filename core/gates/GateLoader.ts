import fs from 'fs';
import { join } from 'path';
import { logger } from '../logger';

/**
 * The GateLoader class is responsible for loading gates
 * from the project and registered plugins.
 */
export class GateLoader {
  private static packageRoot = join(__dirname, '../..');

  /**
   * Loads gates from the project and registered plugins.
   */
  static async loadGatesFromDirectory(): Promise<void> {
    /**
     * Load package gates (silently skip if directory doesn't exist)
     */
    const packageGatesPath = join(this.packageRoot, 'core/gates');
    if (fs.existsSync(packageGatesPath)) {
      await this.loadGatesFromPath(packageGatesPath);
    }

    /**
     * Load project gates (log warning if directory doesn't exist)
     */
    const projectGatesPath = join(process.cwd(), 'src/gates');
    if (fs.existsSync(projectGatesPath)) {
      await this.loadGatesFromPath(projectGatesPath);
    } else {
      console.log(
        'No gates directory found in project. Create src/gates to add custom gates.'
      );
    }
  }

  /**
   * Loads gates from a given path.
   * @param basePath
   */
  private static async loadGatesFromPath(basePath: string): Promise<void> {
    const loadGatesRecursively = async (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await loadGatesRecursively(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            await import(fullPath);
          } catch (error) {
            logger.error(`Failed to load gates from ${file}:`, error);
          }
        }
      }
    };

    await loadGatesRecursively(basePath);
  }
}
