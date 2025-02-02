import { extendedController, simpleController } from '../bootstrap/controller';
import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeController extends Command {
  name = 'make:controller';
  description = 'Create a new Controller';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: {
      full?: boolean;
    };
  }): Promise<void> {
    const [name] = context.args;

    const cDir = join(process.cwd(), 'src', 'controllers');

    mkdirSync(cDir, { recursive: true });

    const filePath = join(cDir, `${name}.ts`);
    let content = simpleController(name);

    if (context.options?.full) {
      content = extendedController(name);
    }

    writeFileSync(filePath, content);
    console.log(
      `\n${chalk.green('✅ Success!')} Controller ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
