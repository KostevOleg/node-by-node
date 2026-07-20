FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn prisma:generate
RUN yarn build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY package.json yarn.lock .yarnrc.yml ./
EXPOSE 3000
CMD ["sh", "-c", "yarn prisma:deploy && node dist/main"]
