FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock* ./
COPY client/package.json client/
COPY server/package.json server/
RUN bun install --frozen-lockfile

COPY . .
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN bun run build

RUN mkdir -p /data && chown bun:bun /data
USER bun
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "server/src/index.ts"]
