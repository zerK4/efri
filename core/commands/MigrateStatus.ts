import { ConfigLoader } from '@/config';
import { Command } from '../cli/Command';
import { DatabaseManager } from '@/database/DBManager';
import { Migrator } from '@/database/Migrator';
import chalk from 'chalk';

const databaseConfig = await ConfigLoader.getConfig('connections');

export default class MigrateStatus extends Command {
  name = 'migrate:status';
  description = 'Check the status of the migrations';
  dependencies = [];

  async execute({
    options,
  }: {
    args: string[];
    options: Record<string, boolean | string>;
  }): Promise<void> {
    const db = new DatabaseManager(databaseConfig!);
    const migrator = new Migrator(db, options['path'] as string);

    try {
      await migrator.status();
    } catch (error) {
      console.error(chalk.red('Evidentiate the error:'), error);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  }
}
