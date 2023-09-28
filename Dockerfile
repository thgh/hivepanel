FROM node:20-alpine AS base


FROM base AS runner
RUN apk add --no-cache docker
WORKDIR /app
COPY dist ./dist
COPY bundle/server.mjs bundle/index.mjs .
EXPOSE 80
CMD ["node", "server.mjs"]
