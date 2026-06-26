import { describe, expect, it } from '@jest/globals';
import { validationSchema } from './env.validation';

describe('env validation schema', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: 3000,
    POSTGRES_HOST: 'postgres',
    POSTGRES_PORT: 5432,
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
    POSTGRES_DB: 'node_by_node',
    DATABASE_URL: 'postgresql://postgres:postgres@postgres:5432/node_by_node',
    REDIS_HOST: 'redis',
    REDIS_PORT: 6379,
    RABBITMQ_URL: 'amqp://rabbitmq:5672',
  };

  const validateEnv = (env: Record<string, unknown>) =>
    validationSchema.validate(env);

  it('validates correct environment variables', () => {
    const result = validateEnv(validEnv);

    expect(result.error).toBeUndefined();
  });

  it('rejects missing required database config', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { POSTGRES_HOST, ...env } = validEnv;
    const result = validateEnv(env);

    expect(result.error).toBeDefined();
  });

  it('rejects invalid RABBITMQ_URL', () => {
    const result = validateEnv({
      ...validEnv,
      RABBITMQ_URL: 'not-a-url',
    });

    expect(result.error).toBeDefined();
  });

  it('uses defaults for optional variables', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { NODE_ENV, PORT, ...env } = validEnv;
    const result = validateEnv(env);

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });
});
