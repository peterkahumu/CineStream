ARG NODE_VERSION_BUILD=dhi.io/node:26-alpine3.24-dev@sha256:82e1032dbce3eac8b0c4844ca2b17788b6b8633be4502e2f6d89cc9643fa6cd9
ARG NODE_VERSION_RUNNER=dhi.io/node:26-alpine3.24@sha256:0d49cc0a4ae6adcdb2e85d998818feccb288c776a5524e98780d18a65980f887

#  install dependencies.
FROM ${NODE_VERSION_BUILD} AS dependencies

WORKDIR /app

COPY package-lock.json package.json ./

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
    else \
    echo "Lockfile not found" && exit 1; \
    fi


# build the next-js application in standalone stage.
FROM ${NODE_VERSION_BUILD} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ -f package-lock.json ]; then \
    npm run build; \
    else \
    echo "Lockfile missing" && exit 1; \
    fi

# run the application.
FROM ${NODE_VERSION_RUNNER} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]