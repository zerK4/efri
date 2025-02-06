export abstract class Command {
  abstract name: string;
  abstract execute(...args: any[]): Promise<void>;
  description?: string;
  dependencies?: string[];

  /**
   * Define command options to be shown in the CLI help
   */
  static options: Array<{
    name: string;
    type: string;
    description?: string;
  }> = [];
}
