import { Command } from '@/cli/Command';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeCommand extends Command {
  name = 'make:command';
  description = 'Create a new command';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;
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

    writeFileSync(filePath, content);
    console.log(`Command ${name} created at ${filePath}`);
  }
}
