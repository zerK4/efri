import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { migration } from '../bootstrap/migration';

export default class MakeMigration extends Command {
  name = 'make:migration';
  description = 'Create a new database schema';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;

    // Validate that a name is provided
    if (!name) {
      console.error(chalk.red('❌ Error: A migration name must be provided.'));
      return;
    }

    const cDir = join(process.cwd(), 'src', 'database/migrations');
    mkdirSync(cDir, { recursive: true });

    const timestamp = new Date().getTime();

    // Use the name as-is if there's no underscore
    const finalName = name.includes('_')
      ? name
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('')
      : name.charAt(0).toUpperCase() + name.slice(1);

    const filePath = join(cDir, `${timestamp}_${name}.ts`);
    const content = migration(finalName, name);

    writeFileSync(filePath, content);
    console.log(
      `\n${chalk.green('✅ Success!')} Migration ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
