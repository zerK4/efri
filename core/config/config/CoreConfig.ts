import { z } from 'zod';
import type { ConfigRegistry } from '../../types';
import { CoreError } from '../../errors/CoreError';

type ConfigMap = Map<string, unknown>;

export class CoreConfig {
  private configs: ConfigMap = new Map();
  private static instance: CoreConfig;

  public static getInstance(): CoreConfig {
    if (!this.instance) {
      this.instance = new CoreConfig();
    }
    return this.instance;
  }

  defineConfig<T extends z.ZodType>(
    name: string,
    schema: T | Record<string, unknown>,
    options: { prefix?: string } = {}
  ): void {
    let config: unknown;

    if (typeof schema.safeParse === 'function') {
      const transformedEnv = this.transformEnvKeys(
        process.env,
        name,
        options.prefix
      );

      const parsed = schema.safeParse(transformedEnv);
      if (!parsed.success) {
        throw new CoreError({
          message: `Environment variable validation failed:\n${parsed.error.issues
            .map((issue: any) => `- ${issue.path.join('.')}: ${issue.message}`)
            .join('\n')}`,
          cause: parsed.error,
        });
      }

      config = parsed.data;
    } else {
      config = schema;
    }

    this.configs.set(name, config);
  }

  private transformEnvKeys(
    env: NodeJS.ProcessEnv,
    configName: string,
    customPrefix?: string
  ): Record<string, string | undefined> {
    const prefix = customPrefix || configName.toUpperCase();
    const transformedEnv: Record<string, string | undefined> = {};

    Object.entries(env).forEach(([key, value]) => {
      if (key.startsWith(`${prefix}_`)) {
        const schemaKey = key.slice(prefix.length + 1).toLowerCase();
        transformedEnv[schemaKey] = value;
      }
    });

    return {
      ...env,
      ...transformedEnv,
    };
  }

  get<K extends string & keyof ConfigRegistry>(
    name: K
  ): ConfigRegistry[K] | undefined {
    return this.configs.get(name) as ConfigRegistry[K] | undefined;
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.configs);
  }

  has(name: string): boolean {
    return this.configs.has(name);
  }

  clear(): void {
    this.configs.clear();
  }

  validateSchema<T extends z.ZodType>(
    schema: T,
    options: { prefix?: string } = {}
  ): z.infer<T> {
    const transformedEnv = this.transformEnvKeys(
      process.env,
      '',
      options.prefix
    );
    const parsed = schema.safeParse(transformedEnv);

    if (!parsed.success) {
      throw new CoreError({
        message: `Environment variable validation failed:\n${parsed.error.issues
          .map((issue: any) => `- ${issue.path.join('.')}: ${issue.message}`)
          .join('\n')}`,
        cause: parsed.error,
      });
    }

    return parsed.data;
  }
}

export const config = CoreConfig.getInstance();
