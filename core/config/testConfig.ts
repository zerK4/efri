import { z } from 'zod';
import { config } from './config/CoreConfig';

const AppSchema = z.object({
  PORT: z.number(),
  HOST: z.string().default('localhost'),
});

config.defineConfig('app', AppSchema);

config.defineConfig('app', AppSchema);
