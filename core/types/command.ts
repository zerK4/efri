import type { Command } from '@/cli/Command';

export interface CommandSource {
  path: string;
  type: 'core' | 'user' | 'package';
  priority: number;
}

export interface CommandMetadata {
  command: Command;
  source: CommandSource;
  loadedAt: Date;
  dependencies?: string[];
}
