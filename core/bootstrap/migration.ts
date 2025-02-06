export const migration = (finalName: string, name: string) => `
import { Migration } from "efri/core/database/Migration";

export class ${finalName} extends Migration {
  async up(): Promise<void> {
    await this.schema.create("${name}", (table) => {
      table.increments("id");
      table.timestamps(true, true);
    });
  }

  async down(): Promise<void> {
    await this.schema.dropIfExists("${name}");
  }
}
`;
