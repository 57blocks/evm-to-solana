FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ && corepack enable

COPY package.json pnpm-lock.yaml prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY idl ./idl

RUN pnpm install --frozen-lockfile

COPY src ./src
COPY scripts ./scripts

RUN pnpm db:generate && pnpm build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/idl ./idl

CMD ["node", "dist/src/main.js"]
