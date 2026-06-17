# Node by Node

## How to Run the Application

Create `.env` from `.env.example`, then run:

```bash
yarn install
yarn start:dev
```

Application URL: `http://localhost:3000`

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
