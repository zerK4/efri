import { z } from 'zod';

const appSchema = z
  .object({
    env: z
      .enum(['local', 'development', 'production', 'testing'])
      .default('local'),
    name: z.string().default('starta'),
    port: z
      .string()
      .regex(/^\d+$/, 'APP_PORT must be a valid number')
      .transform((val) => parseInt(val, 10))
      .catch(() => 3000) // Fallback if parsing fails
      .default('3000'),
    database: z
      .enum(['mysql', 'sqlite', 'turso', 'postgresql'])
      .default('sqlite'),
    db_host: z.string().optional(), // Conditionally required
    db_port: z
      .string()
      .regex(/^\d+$/, 'DB_PORT must be a valid number')
      .transform((val) => parseInt(val, 10))
      .optional(), // Conditionally required
    db_username: z.string().optional(), // Conditionally required
    db_password: z.string().optional(), // Conditionally required
  })
  .refine(
    (data) => {
      if (data.database !== 'sqlite') {
        return !!data.db_port && !!data.db_username && !!data.db_password;
      }
      return true;
    },
    {
      message:
        "DB_HOST, DB_USERNAME, and DB_PASSWORD are required when DATABASE is not 'sqlite'.",
      path: ['DATABASE'], // Point to the DATABASE field
    }
  )
  .refine(
    (data) => {
      if (data.database !== 'sqlite') {
        return !!data.db_port;
      }
      return true;
    },
    {
      message: "DB_PORT is required when DATABASE is not 'sqlite'.",
      path: ['DB_PORT'],
    }
  );

const validateEnv = () => {
  const parsed = appSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${parsed.error.issues
        .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`
    );
  }
  return parsed.data;
};

export const app = validateEnv();

export default appSchema;
