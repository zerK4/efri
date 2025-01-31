import type { DatabaseManager } from './DBManager';
import { Schema } from './Schema';

export abstract class Migration {
  protected schema: Schema;

  constructor(protected db: DatabaseManager) {
    this.schema = new Schema(db.connection().query());
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;
}
