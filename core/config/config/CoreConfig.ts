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
    schema: T | Record<string, unknown>
  ): void {
    let config: unknown;
    if (typeof schema.safeParse === 'function') {
      const parsed = schema.safeParse(process.env);
      if (!parsed.success) {
        throw new CoreError({
          message: `Environment variable validation failed:\n${parsed.error.issues
            .map((issue: any) => `- ${issue.path.join('.')}: ${issue.message}`)
            .join('\n')}`,
          cause: parsed.error,
        });
      }

      // Store the parsed data instead of the schema
      config = parsed.data;
    } else {
      // If it's a plain object, store it directly
      config = schema;
    }

    this.configs.set(name, config);
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

  validateSchema<T extends z.ZodType>(schema: T): z.infer<T> {
    const parsed = schema.safeParse(process.env);

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
