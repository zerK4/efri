import { Command } from '../cli/Command';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

export default class MakeCommand extends Command {
  name = 'make:command';
  description = 'Create a new command';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    let [name] = context.args;

    if (!name) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: chalk.blue('Enter the name of the command:'),
          validate: (input) =>
            input.trim() ? true : chalk.red('Command name cannot be empty'),
        },
      ]);
      name = answers.name;
    }

    const commandsDir = join(process.cwd(), 'src', 'commands');
    mkdirSync(commandsDir, { recursive: true });

    const filePath = join(commandsDir, `${name}.ts`);

    const content = `
import { Command } from "efri/core/cli/Command";

export default class ${name} extends Command {
  name = "${name}";
  description = "Description for ${name}";
  dependencies = [];

  async execute(context: { 
    args: string[], 
    options: Record<string, boolean> 
  }): Promise<void> {
    const [name] = context.args;
    // Implement command logic here
  }
}
    `;

    writeFileSync(filePath, content.trimStart());

    console.log(
      `\n${chalk.green('✅ Success!')} Command ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
