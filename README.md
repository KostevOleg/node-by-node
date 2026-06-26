# Node by Node

## How to Run the Application

Create `.env` from `.env.example`, then run:

```bash
yarn install
yarn prisma:generate
yarn start:dev
```

Application URL: `http://localhost:3000`

## Database Migrations

Set `DATABASE_URL` in `.env`, then run:

```bash
yarn prisma:migrate
```

For Docker/production-style startup, apply existing migrations with:

```bash
yarn prisma:deploy
```

## How to Start Docker Services

```bash
docker compose up --build
```

```bash
docker compose down
```

Docker starts the NestJS app, PostgreSQL, Redis and RabbitMQ.
RabbitMQ UI is available at `http://localhost:15672`.

## How to Run Tests

```bash
yarn test
```

## Code Quality

Run ESLint and auto-fix issues:

```bash
yarn lint
```

Check ESLint without changing files:

```bash
yarn lint:check
```

Format source and test files with Prettier:

```bash
yarn format
```

Check Prettier formatting without changing files:

```bash
yarn format:check
```
