import fs from 'fs';
import path from 'path';
import { DatabaseManager } from './DBManager';
import chalk from 'chalk';
import { CoreError } from '../errors/CoreError';

export class Migrator {
  private migrationsPath: string;
  private db: DatabaseManager;

  constructor(db: DatabaseManager, migrationsPath?: string) {
    this.db = db;
    this.migrationsPath =
      migrationsPath ||
      path.join(process.cwd(), 'src', 'database', 'migrations');
  }

  private async ensureMigrationsTable(): Promise<void> {
    const connection = this.db.connection();
    const exists = await connection.query().schema.hasTable('migrations');

    if (!exists) {
      await connection.query().schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name').unique();
        table.integer('batch');
        table.timestamps(true, true);
      });
    }
  }

  private async getLatestBatch(): Promise<number> {
    const result = await this.db
      .connection()
      .query()
      .from('migrations')
      .max('batch as maxBatch')
      .first();

    return (result?.maxBatch || 0) as number;
  }

  private async getMigrationFiles(): Promise<string[]> {
    return fs
      .readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith('.ts'))
      .sort();
  }

  private async getAppliedMigrations(): Promise<Set<string>> {
    const migrations = await this.db
      .connection()
      .query()
      .from('migrations')
      .select('name');

    return new Set(migrations.map((m) => m.name));
  }

  private async importMigration(migrationPath: string): Promise<any> {
    try {
      // Import the migration module
      const module = await import(migrationPath);

      // Try different ways to get the migration class
      const MigrationClass = module.default || Object.values(module)[0];

      if (!MigrationClass) {
        throw new CoreError({
          message: `No migration class found in ${migrationPath}`,
        });
      }

      return MigrationClass;
    } catch (error) {
      console.error(`Error importing migration from ${migrationPath}:`, error);
      throw error;
    }
  }

  public async migrate(
    options: { step?: number; pretend?: boolean } = {}
  ): Promise<void> {
    await this.ensureMigrationsTable();

    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const batch = (await this.getLatestBatch()) + 1;

    const pendingMigrations = migrationFiles
      .filter((file) => !appliedMigrations.has(file.split('.')[0]))
      .slice(0, options.step);

    if (pendingMigrations.length === 0) {
      console.log(chalk.yellow('Nothing to migrate.'));
      return;
    }

    for (const file of pendingMigrations) {
      const migrationName = file.split('.')[0];
      const migrationPath = path.join(this.migrationsPath, file);

      try {
        if (options.pretend) {
          console.log(chalk.yellow(`Would run migration: ${migrationName}`));
          continue;
        }

        // Import and instantiate the migration
        const MigrationClass = await this.importMigration(migrationPath);
        const instance = new MigrationClass(this.db);

        if (typeof instance.up !== 'function') {
          throw new CoreError({
            message: `Migration ${migrationName} does not implement 'up' method`,
          });
        }

        await instance.up();

        await this.db.connection().query().from('migrations').insert({
          name: migrationName,
          batch: batch,
        });

        console.log(
          `${chalk.bgGreen.white(' MIGRATED ')} ${chalk.yellow(migrationName)}`
        );
      } catch (error) {
        console.error(`Error running migration ${migrationName}:`, error);
        this.db
          .connection()
          .query()
          .from('migrations')
          .where('name', migrationName)
          .del();
        throw error;
      }
    }
  }

  public async rollback(
    options: { step?: number; batch?: number; pretend?: boolean } = {}
  ): Promise<void> {
    console.log(chalk.blue('\n Migration rollback\n--------------------'));
    await this.ensureMigrationsTable();

    const query = this.db
      .connection()
      .query()
      .from('migrations')
      .orderBy('id', 'desc');

    if (options.batch) {
      query.where('batch', options.batch);
    }

    if (options.step) {
      query.limit(options.step);
    }

    const migrations = await query;

    if (migrations.length === 0) {
      console.log(`\n ${chalk.yellow('Nothing to rollback.')} \n`);
      return;
    }

    for (const migration of migrations) {
      const file = `${migration.name}.ts`;
      const migrationPath = path.join(this.migrationsPath, file);

      try {
        if (options.pretend) {
          console.log(`Would rollback: ${chalk.yellow(migration.name)}`);
          continue;
        }

        const MigrationClass = await this.importMigration(migrationPath);
        const instance = new MigrationClass(this.db);

        if (typeof instance.down !== 'function') {
          throw new CoreError({
            message: `Migration ${migration.name} does not implement 'down' method`,
          });
        }

        await instance.down();

        await this.db
          .connection()
          .query()
          .from('migrations')
          .where('id', migration.id)
          .delete();

        console.log(
          `\n ${chalk.bgGreen.white(' ROLLED BACK ')} ${chalk.yellow(
            migration.name
          )} \n`
        );
      } catch (error) {
        console.error(
          `${chalk.bgRed.white(' ERROR ')} ${chalk.yellow(
            `rolling back migration ${migration.name}`
          )}:`,
          error
        );
        throw error;
      }
    }
  }

  public async status(): Promise<void> {
    await this.ensureMigrationsTable();

    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    console.log(chalk.blue('\nMigration Status\n----------------'));

    for (const file of migrationFiles) {
      const migrationName = file.split('.')[0];
      const status = appliedMigrations.has(migrationName)
        ? chalk.green('✓')
        : chalk.red('✗');
      console.log(`${status} ${chalk.yellow(migrationName)}`);
    }
    console.log();
  }
}
