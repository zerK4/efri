import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import type { ConfigRegistry } from '../../types';

export class ConfigLoader {
  private static configs: Map<string, any> = new Map();
  private static customConfigPaths: string[] = [];
  private static logger: Console = console;
  private static plugins: Array<(loader: typeof ConfigLoader) => void> = [];
  private static configSources: Map<string, string> = new Map();

  static configure(options: {
    logger?: Console;
    plugins?: Array<(loader: typeof ConfigLoader) => void>;
  }) {
    if (options.logger) this.logger = options.logger;
    if (options.plugins) this.plugins = options.plugins;
  }

  static addConfigPath(path: string): void {
    this.customConfigPaths.push(path);
  }

  private static getConfigSources(): Array<{
    path: string;
    priority: number;
    name: string;
  }> {
    return [
      {
        path: join(__dirname, '../configs'),
        priority: 1,
        name: 'Default Configs',
      },
      {
        path: join(process.cwd(), 'src/config'),
        priority: 2,
        name: 'Project Configs',
      },
      ...this.customConfigPaths.map((path, index) => ({
        path,
        priority: 3 + index,
        name: `Custom Config ${index + 1}`,
      })),
    ];
  }

  private static unwrapModuleConfig(config: any): any {
    return config?.default || config;
  }

  static async loadConfigsFromPath(
    path: string,
    sourceName: string
  ): Promise<string[]> {
    const loadedConfigs: string[] = [];

    const env =
      this.configs?.get('app')?.env !== 'production' &&
      process.env.NODE_ENV !== 'production';

    if (!existsSync(path)) {
      if (env) {
        this.logger.log(
          `${chalk.yellow('No config folder found, creating it...')} at ${path}`
        );
        mkdirSync(path, { recursive: true });
      }
      return loadedConfigs;
    }

    const files = readdirSync(path).filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.d.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.ts')
    );

    for (const file of files) {
      try {
        const filePath = join(path, file);
        const ConfigModule = await import(filePath);
        const schema = this.unwrapModuleConfig(ConfigModule);

        if (schema) {
          const configName = file.replace(/\.(ts|js)$/, '');
          this.configs.set(configName, schema);
          this.configSources.set(configName, sourceName);
          loadedConfigs.push(configName);
        } else {
          this.logger.warn(
            `Skipping config ${file}: Missing schema or invalid configuration`
          );
        }
      } catch (error) {
        this.logger.error(`Error loading config from ${file}:`, error);
      }
    }

    return loadedConfigs;
  }

  static validateAppEnv = <S extends z.ZodType>(appSchema: S) => {
    const parsed = appSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid application environment variables:\n${parsed.error.issues
          .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
          .join('\n')}`
      );
    }

    return parsed.data as z.infer<S>;
  };

  static async loadConfigs(): Promise<void> {
    const sources = this.getConfigSources();
    const loadSummary: { sourceName: string; configs: string[] }[] = [];

    for (const source of sources) {
      const loadedConfigs = await this.loadConfigsFromPath(
        source.path,
        source.name
      );
      if (loadedConfigs.length > 0) {
        loadSummary.push({
          sourceName: source.name,
          configs: loadedConfigs,
        });
      }
    }

    this.plugins.forEach((plugin) => plugin(this));

    if (loadSummary.length > 0) {
      this.logger.log(chalk.green('\nConfiguration Loading Summary:'));
      loadSummary.forEach(({ sourceName, configs }) => {
        this.logger.log(
          `${chalk.blue(sourceName)} (${configs.length} configs):`
        );
        configs.forEach((config) => {
          this.logger.log(`  - ${config}`);
        });
      });
      this.logger.log(
        chalk.green('\n✨ All configurations loaded successfully!\n')
      );
    } else {
      this.logger.log(
        chalk.yellow('No configurations were loaded from any source.')
      );
    }
  }

  static async getConfig<K extends keyof ConfigRegistry>(
    name: K
  ): Promise<ConfigRegistry[K] | undefined> {
    if (this.configs.size === 0) {
      await this.loadConfigs();
    }
    return this.configs.get(name as string) as ConfigRegistry[K];
  }

  static getConfigSource(name: string): string | undefined {
    return this.configSources.get(name);
  }

  static listConfigs(): { name: string; config: any; source: string }[] {
    return Array.from(this.configs.entries()).map(([name, config]) => ({
      name,
      config,
      source: this.configSources.get(name) || 'Unknown',
    }));
  }

  static reset(): void {
    this.configs.clear();
    this.configSources.clear();
  }
}
