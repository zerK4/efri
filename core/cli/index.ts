#!/usr/bin/env bun

import chalk from 'chalk';
import figlet from 'figlet';
import { CommandLoader } from './CommandLoader';
import { logger } from '../logger';

async function main() {
  // Load commands before processing
  await CommandLoader.loadCommands();

  const args = process.argv.slice(2);
  const commandName = args[0];

  if (!commandName) {
    displayAvailableCommands();
    return;
  }

  const command = CommandLoader.getCommand(commandName);

  if (!command) {
    logger.error(
      `\n  ${chalk.yellow('⚠')}  Command "${commandName}" not found\n`
    );
    displayAvailableCommands();
    return;
  }

  // Adjusted to match new Command interface
  await command.execute({
    args: args.slice(1),
    options: parseOptions(args),
  });
}

type Option = { name: string; type: string; description: string };

// Helper function to get options from the command class
function getCommandOptions(command: any): Array<Option> {
  const executeParams = command.constructor?.prototype?.execute?.length;

  if (!executeParams) return [];

  if (command.options) {
    return command.options.map((option: Option) => ({
      name: option.name,
      type: option.type,
      description: option.description,
    }));
  }

  return [];
}

function displayAvailableCommands(): void {
  console.log(
    '\n' + chalk.green(figlet.textSync('EFRI CLI', { font: 'Small' }))
  );

  console.log('\n' + chalk.blue('📦 Available Commands:') + '\n');

  const commands = CommandLoader.listCommands();
  const coreCommands = commands.filter((cmd) => cmd.type === 'core');
  const userCommands = commands.filter((cmd) => cmd.type === 'user');

  function displayCommandGroup(title: string, groupCommands: typeof commands) {
    if (groupCommands.length > 0) {
      console.log(chalk.yellow(`  ${title} Commands:`));
      groupCommands.forEach(({ command }) => {
        // Display command name and description
        console.log(
          `  ${chalk.green('▸')} ${chalk.blue(
            command.name.padEnd(20)
          )} ${chalk.dim(command.description || 'No description')}`
        );

        // Get and display command options
        const options = getCommandOptions(command);
        if (options.length > 0) {
          console.log(`    ${chalk.dim('Options:')}`);
          options.forEach((option) => {
            const optionFlag = `--${option.name}`;
            const optionType = option.type ? ` <${option.type}>` : '';
            const optionDescription = option.description || 'No description';
            console.log(
              `      ${chalk.cyan(optionFlag.padEnd(15))}${chalk.dim(optionType.padEnd(5))} ${chalk.dim(optionDescription)}`
            );
          });
        }
      });
      console.log();
    }
  }

  displayCommandGroup('Core', coreCommands);
  displayCommandGroup('User', userCommands);

  console.log(chalk.dim('  Usage:'));
  console.log(chalk.dim('    $ bun cli <command> [options]\n'));
}

function parseOptions(args: string[]): Record<string, boolean> {
  return args.reduce(
    (opts, arg) => {
      if (arg.startsWith('--')) {
        opts[arg.slice(2)] = true;
      }
      return opts;
    },
    {} as Record<string, boolean>
  );
}

main().catch((error) => {
  logger.error(chalk.red('CLI Execution Error:'), error);
  process.exit(1);
});
