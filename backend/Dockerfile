FROM public.ecr.aws/docker/library/node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --registry=https://registry.npmjs.org
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev
FROM public.ecr.aws/docker/library/node:24-bookworm-slim
ENV NODE_ENV=production API_HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node admin ./admin
COPY --chown=node:node data ./data
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/scripts/init-storage.js && node dist/scripts/seed-recipes.js && exec node dist/src/main.js"]
