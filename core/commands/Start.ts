import { Command } from '../cli/Command';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export default class StartServer extends Command {
  name = 'start';
  description = 'Start the EFRI server';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean>;
  }): Promise<void> {
    try {
      const startDev = context.args.includes('--dev');
      console.log(chalk.green('🚀 Starting EFRI server...'));

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const scriptPath = resolve(__dirname, '../scripts/startServer.ts');

      const serverProcess = spawn(
        'bun',
        [startDev ? '--watch' : 'run', scriptPath],
        {
          stdio: 'inherit',
          shell: true,
        }
      );

      serverProcess.on('error', (error) => {
        console.error(chalk.red('❌ Server failed to start:'), error);
      });

      serverProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Server stopped successfully.'));
        } else {
          console.error(chalk.red(`❌ Server exited with code ${code}`));
        }
      });
    } catch (error) {
      console.error(chalk.red('❌ Server failed to start:'), error);
    }
  }
}
