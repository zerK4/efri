import { Command } from '../cli/Command';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

export default class MakeValidator extends Command {
  name = 'make:validator';
  description = 'Create a new validator';
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
          message: 'Enter the name of the validator:',
          validate: (input) =>
            input.trim() ? true : 'Validator name cannot be empty',
        },
      ]);
      name = answers.name;
    }

    const validatorsDir = join(process.cwd(), 'src', 'validators');
    mkdirSync(validatorsDir, { recursive: true });

    const filePath = join(validatorsDir, `${name}.ts`);
    const content = `
import { z } from "zod";
import { validator } from "efri/core/validators/CoreValidator";

validator.define(
  "${name}",
  z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
  })
);

validator.middleware("${name}");
`;

    writeFileSync(filePath, content.trimStart());
    console.log(
      `\n${chalk.green('✅ Success!')} Validator ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
