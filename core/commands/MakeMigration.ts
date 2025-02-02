import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeMigration extends Command {
  name = 'make:migration';
  description = 'Create a new database schema';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;
    const cDir = join(process.cwd(), 'src', 'database/migrations');

    mkdirSync(cDir, { recursive: true });

    const timestamp = new Date().getTime();

    const [first, second] = name.split('_');
    const finalName = `${first.charAt(0).toUpperCase()}${first.slice(1)}${second
      .charAt(0)
      .toUpperCase()}${second.slice(1)}Table`;

    const filePath = join(cDir, `${timestamp}_${name}.ts`);
    const content = `
import { Migration } from "efri/core/config/database/Migration";

export class ${finalName} extends Migration {
  async up(): Promise<void> {
    await this.schema.create("${second}", (table) => {
      table.increments("id");
      table.timestamps(true, true);
    });
  }

  async down(): Promise<void> {
    await this.schema.dropIfExists("users");
  }
}
`;

    writeFileSync(filePath, content);
    console.log(
      `\n${chalk.green('✅ Success!')} Migration ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
