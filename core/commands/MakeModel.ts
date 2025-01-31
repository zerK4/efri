import { Command } from '@/cli/Command';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeModel extends Command {
  name = 'make:model';
  description = 'Create a new model';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;
    const modelsDir = join(process.cwd(), 'src', 'models');

    mkdirSync(modelsDir, { recursive: true });

    const filePath = join(modelsDir, `${name}.ts`);
    const content = `
import Model from "efri/core/models/Model";

export interface I${name} {
  id: number;
}

export class ${name} extends Model<I${name}> {
  protected static primaryKey: string = "id";
  public table?: string | undefined = ${name.toLocaleLowerCase()}s;
}
`;

    writeFileSync(filePath, content);
    console.log(`Model ${name} created at ${filePath}`);

    if (context.options['migration']) {
      // Potential future implementation for automatic migration creation
      console.log(`Consider creating a migration for ${name}`);
    }
  }
}
