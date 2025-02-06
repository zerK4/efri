import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeGate extends Command {
  name = 'make:middleware';
  description = 'Create a new middleware';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;
    const middlewareDir = join(process.cwd(), 'src', 'middlewares');

    mkdirSync(middlewareDir, { recursive: true });

    const filePath = join(middlewareDir, `${name}.ts`);
    const content = `import { middlewareStack } from "efri/core/middlewares";

export default middlewareStack.register("${name}", {
  async handle(req: Request, next: () => Promise<Response>): Promise<Response> {
    return await next();
  },
});
`;
    writeFileSync(filePath, content);
    console.log(
      `\n${chalk.green('✅ Success!')} Middleware ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
