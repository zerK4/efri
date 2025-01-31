#!/usr/bin/env bun

import chalk from 'chalk';
import figlet from 'figlet';
import { CommandLoader } from './CommandLoader';

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
    console.error(
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
        console.log(
          `  ${chalk.green('▸')} ${chalk.blue(
            command.name.padEnd(20)
          )} ${chalk.dim(command.description || 'No description')}`
        );
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
  console.error(chalk.red('CLI Execution Error:'), error);
  process.exit(1);
});
