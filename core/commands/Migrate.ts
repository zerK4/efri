import { Command } from '../cli/Command';
import { config } from '../config/config/CoreConfig';
import { DatabaseManager } from '../database/DBManager';
import { Migrator } from '../database/Migrator';

export default class Migrate extends Command {
  name = 'migrate';
  description = 'Run database migrations';
  dependencies = [];

  async execute(context: {
    args: string[];
    options: Record<string, boolean | string>;
  }): Promise<void> {
    const db = new DatabaseManager(config.get('connections')!);
    const migrator = new Migrator(db, context.options['path'] as string);

    try {
      await migrator.migrate({
        step: context.options['step']
          ? parseInt(context.options['step'] as string)
          : undefined,
        pretend: (context.options['pretend'] as boolean) || false,
      });
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  }
}
