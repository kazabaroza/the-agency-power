# The Agency Power – production image (Railway, any Docker host)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 DATA_DIR=/app/data
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/agents ./agents
COPY --from=build /app/next.config.mjs ./
# Database and generated files live here; mount a persistent volume at /app/data.
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
# Bind to all interfaces (IPv4 + IPv6) explicitly: hosts like Fly set HOSTNAME to the machine id
# and reach the app over IPv6 too.
CMD ["sh", "-c", "npx next start -H :: -p ${PORT:-3000}"]
