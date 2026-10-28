# The Agency Power – production image (Railway, any Docker host)
FROM node:22.22.0-bookworm-slim AS deps
WORKDIR /srv/agency
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.22.0-bookworm-slim AS build
WORKDIR /srv/agency
COPY --from=deps /srv/agency/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22.22.0-bookworm-slim
WORKDIR /srv/agency
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 DATA_DIR=/data
COPY --from=build /srv/agency/package.json ./
COPY --from=build /srv/agency/node_modules ./node_modules
COPY --from=build /srv/agency/.next ./.next
COPY --from=build /srv/agency/public ./public
COPY --from=build /srv/agency/agents ./agents
COPY --from=build /srv/agency/next.config.mjs ./
# Database and generated files live here; mount a persistent volume at /data.
# (The project is not at /app: a root-level /app plus the app/ router dir and the
#  app/app/ route segment made Next.js resolve the wrong root layout.)
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
# Bind to all interfaces (IPv4 + IPv6) explicitly: hosts like Fly set HOSTNAME to the machine id
# and reach the app over IPv6 too.
CMD ["sh", "-c", "npx next start -H :: -p ${PORT:-3000}"]
