import { Command } from '../cli/Command';
import { ConfigLoader } from '../config';
import { DatabaseManager } from '../database/DBManager';
import { Migrator } from '../database/Migrator';

const databaseConfig = await ConfigLoader.getConfig('connections');

export default class MigrateRollback extends Command {
  name = 'migrate:rollback';
  description = 'Rollback database migrations';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean | string>;
  }): Promise<void> {
    const db = new DatabaseManager(databaseConfig!);
    const migrator = new Migrator(db, context.options['path'] as string);

    try {
      await migrator.rollback({
        step: context.options['step']
          ? parseInt(context.options['step'] as string)
          : undefined,
        batch: context.options['batch']
          ? parseInt(context.options['batch'] as string)
          : undefined,
        pretend: (context.options['pretend'] as boolean) || false,
      });
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  }
}
