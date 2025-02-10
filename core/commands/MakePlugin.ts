import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import {
  loggerPlugin,
  responseHelperPlugin,
  routePlugin,
} from '../bootstrap/plugin';
import { extractPathInfo } from '../cli/utils';
import { logger } from '../logger';

export default class MakePlugin extends Command {
  name = 'make:plugin';
  description = 'Create a new plugin default to route plugin.';
  dependencies = [];

  options = [
    {
      name: 'response',
      description: 'Will create a response helper plugin',
    },
    {
      name: 'route',
      description: 'Will create a route plugin',
    },
    {
      name: 'logger',
      description: 'Will create a logger plugin',
    },
  ];

  async execute(context: {
    args: string[];
    options: {
      response?: boolean;
      route?: boolean;
      logger?: boolean;
    };
  }): Promise<void> {
    const [pluginPath] = context.args;

    if (!pluginPath) {
      logger.error(chalk.red('Error: Plugin path | name is required'));
      console.log(
        chalk.dim(
          'Usage: bun efri make:plugin <path/to/plugin> | <plugin-name>'
        )
      );
      return;
    }

    try {
      const pathInfo = extractPathInfo(pluginPath, {
        baseFolder: 'plugins',
      });

      mkdirSync(pathInfo.fullPath, { recursive: true });

      let content = routePlugin(pathInfo.name);

      if (context.options?.response) {
        content = responseHelperPlugin(pathInfo.name);
      }

      if (context.options?.logger) {
        content = loggerPlugin(pathInfo.name);
      }

      writeFileSync(pathInfo.filePath, content);

      console.log(
        `\n${chalk.green('✅ Success!')} Plugin created:\n` +
          `${chalk.bold.blue(pathInfo.name)}\n\n` +
          `Location:\n` +
          `📂 ${chalk.dim(pathInfo.baseDir)}\n` +
          pathInfo.directories
            .map((dir) => `  ${chalk.dim('└─')} ${chalk.cyan(dir)}`)
            .join('\n') +
          `\n  ${chalk.dim('└─')} ${chalk.green(pathInfo.name + '.ts')}\n`
      );
    } catch (error) {
      logger.error(
        `\n${chalk.red('❌ Error:')} Failed to create plugin:\n`,
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  }
}
