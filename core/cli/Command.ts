export abstract class Command {
  abstract name: string;
  abstract execute(...args: any[]): Promise<void>;
  description?: string;
  dependencies?: string[];
}
