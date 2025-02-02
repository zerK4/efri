import fs from 'fs';
import { join } from 'path';

/**
 * The ValidatorLoader class is responsible for loading validators
 * from the project and registered plugins.
 */
export class ValidatorLoader {
  private static packageRoot = join(__dirname, '../..');

  /**
   * Loads validators from the project and registered plugins.
   */
  static async loadValidatorsFromDirectory(): Promise<void> {
    /**
     * Load package validators (silently skip if directory doesn't exist)
     */
    const packageValidators = join(this.packageRoot, 'core/validators');
    if (fs.existsSync(packageValidators)) {
      await this.loadValidatorsFromAGivenPath(packageValidators);
    }

    /**
     * Load project validators (log warning if directory doesn't exist)
     */
    const projectValidatorsPath = join(process.cwd(), 'src/validators');
    if (fs.existsSync(projectValidatorsPath)) {
      await this.loadValidatorsFromAGivenPath(projectValidatorsPath);
    } else {
      console.log(
        'No validators directory found in project. Create src/validators to add custom validators.'
      );
    }
  }

  /**
   * Loads validators from a given path.
   * @param basePath
   */
  private static async loadValidatorsFromAGivenPath(
    basePath: string
  ): Promise<void> {
    const loadValidatorsRecursively = async (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await loadValidatorsRecursively(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            await import(fullPath);
          } catch (error) {
            console.error(`Failed to load validators from ${file}:`, error);
          }
        }
      }
    };

    await loadValidatorsRecursively(basePath);
  }
}
