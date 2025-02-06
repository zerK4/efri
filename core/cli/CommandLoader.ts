import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { Command } from './Command';
import chalk from 'chalk';
import type { CommandMetadata, CommandSource } from '../types';
import { logger, type CoreLogger } from '../logger/CoreLogger';

const CommandSchema = z.object({
  name: z.string().min(1),
  execute: z.function(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

export class CommandLoader {
  private static commands: Map<string, CommandMetadata> = new Map();
  private static customCommandPaths: string[] = [];
  private static logger: CoreLogger = logger;
  private static plugins: Array<(loader: typeof CommandLoader) => void> = [];

  // Dependency injection and configuration
  static configure(options: {
    logger?: CoreLogger;
    plugins?: Array<(loader: typeof CommandLoader) => void>;
  }) {
    if (options.logger) this.logger = options.logger;
    if (options.plugins) this.plugins = options.plugins;
  }

  // Path management
  static addCommandPath(path: string): void {
    this.customCommandPaths.push(path);
  }

  // Command source discovery
  private static getCommandSources(): CommandSource[] {
    return [
      {
        path: join(__dirname, '../commands'),
        type: 'core',
        priority: 1,
      },
      {
        path: join(process.cwd(), 'src/commands'),
        type: 'user',
        priority: 2,
      },
      ...this.customCommandPaths.map((path, index) => ({
        path,
        type: 'user' as const,
        priority: 3 + index,
      })),
    ];
  }

  // Comprehensive command validation
  private static validateCommand(command: any): boolean {
    try {
      CommandSchema.parse(command);
      return true;
    } catch (validationError) {
      this.logger.error('Command validation failed:', validationError);
      return false;
    }
  }

  // Dependency resolution
  private static resolveDependencies(command: CommandMetadata): boolean {
    if (!command.command.dependencies) return true;

    return command.command.dependencies.every((dep) => this.commands.has(dep));
  }

  // Advanced command loading
  static async loadCommandsFromPath(source: CommandSource): Promise<void> {
    if (!existsSync(source.path)) {
      console.log(
        `${chalk.yellow('No commands folder found, creating it...')}`
      );
      mkdirSync(source.path, { recursive: true });
    }

    const files = readdirSync(source.path).filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.d.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.ts')
    );

    for (const file of files) {
      try {
        const filePath = join(source.path, file);
        const CommandModule = await import(filePath);
        const CommandClass = CommandModule.default || CommandModule;

        if (CommandClass?.prototype instanceof Command) {
          const command = new CommandClass();

          if (this.validateCommand(command)) {
            const commandMetadata = {
              command,
              source,
              loadedAt: new Date(),
              dependencies: command.dependencies,
            };

            if (this.resolveDependencies(commandMetadata)) {
              this.commands.set(command.name, commandMetadata);
            } else {
              this.logger.warn(
                `Skipping command ${command.name}: Unresolved dependencies`
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error loading command from ${file}:`, error);
      }
    }
  }

  // Comprehensive command loading
  static async loadCommands(): Promise<void> {
    const sources = this.getCommandSources();
    for (const source of sources) {
      await this.loadCommandsFromPath(source);
    }

    // Run any registered plugins
    this.plugins.forEach((plugin) => plugin(this));
  }

  // Existing utility methods
  static getCommand(name: string): Command | undefined {
    return this.commands.get(name)?.command;
  }

  static listCommands(): { command: Command; type: string }[] {
    return Array.from(this.commands.values()).map(({ command, source }) => ({
      command,
      type: source.type,
    }));
  }

  static listCommandsByType(type: string): Command[] {
    return Array.from(this.commands.values())
      .filter(({ source }) => source.type === type)
      .map(({ command }) => command);
  }

  static reset(): void {
    this.commands.clear();
  }

  static hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  static getCommandSource(name: string): CommandSource | undefined {
    return this.commands.get(name)?.source;
  }
}
