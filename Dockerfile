FROM node:20-alpine AS base


FROM base AS runner
WORKDIR /app
COPY dist ./dist
COPY bundle .
COPY package.json ./package.json

# Replace "0.0.1-dev" & "0001-01-01T01:01:01Z" with version & date
RUN sed -i "s/0.0.1-dev/$(node -p -e "require('./package.json').version")/" index-*.*js && sed -i "s/0001-01-01T01:01:01Z/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/" index-*.*js

EXPOSE 80
CMD ["node", "server.mjs"]
