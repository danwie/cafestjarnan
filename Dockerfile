FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock* ./
COPY client/package.json client/
COPY server/package.json server/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

RUN mkdir -p /data && chown bun:bun /data
USER bun
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "server/src/index.ts"]
