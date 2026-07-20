import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().port().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().required(),
  RABBITMQ_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d'),
});
