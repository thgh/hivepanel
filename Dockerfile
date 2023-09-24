FROM node:20-alpine AS base


FROM base AS runner
WORKDIR /app
COPY dist ./dist
COPY server.mjs .
EXPOSE 80
CMD ["node", "server.mjs"]
