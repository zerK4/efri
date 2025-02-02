import { Command } from '../cli/Command';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default class MakeGate extends Command {
  name = 'make:gate';
  description = 'Create a new gate';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    const [name] = context.args;
    const modelsDir = join(process.cwd(), 'src', 'gates');

    mkdirSync(modelsDir, { recursive: true });

    const filePath = join(modelsDir, `${name}.ts`);
    const content = `
import { gate } from "efri/core/gates/CoreGate";
import type { User } from "../models/User";
import type { ResponseHelper } from "efri/core/helpers/ResponseHelper";

gate.define("user.read", async (user: User | null) => {
  console.log("Checking gate for:", user);
  //Replace with actual logged in user.
  return user?.id === 1;
});

export const UserCanRead = async (
  cb: () => Promise<Response>,
  check: string,
  res: ResponseHelper
): Promise<Response> => {
  if (await gate.allows(check)) {
    return cb();
  } else {
    return res.json({ error: "Unauthorized" }, 403);
  }
};

gate.middleware("user.read");
`;
    writeFileSync(filePath, content);
    console.log(
      `\n${chalk.green('✅ Success!')} Gate ${chalk.bold.blue(name)} has been created at:\n` +
        `📂 ${chalk.gray(filePath)}\n`
    );
  }
}
