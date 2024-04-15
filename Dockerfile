FROM node:20.12.2-alpine3.18 AS node
ENV NODE_OPTIONS --unhandled-rejections=strict --enable-source-maps
WORKDIR /app

#
# Stage: NPM environment
#
FROM node AS npm
COPY .npmrc \
  package.json \
  package-lock.json \
  ./

#
# Stage: Development NPM install
#
FROM npm AS npm-dev

RUN npm ci

#
# Stage: Production NPM install
#
FROM npm AS npm-prod

RUN npm ci --production

#
# Stage: Production build
#
FROM npm AS build-prod
ENV NODE_ENV=production

COPY --from=npm-dev /app/node_modules/ node_modules/
COPY tsconfig.build.json \
  tsconfig.json \
  ./
COPY src/ src/

RUN npx tsc --project tsconfig.build.json

#
# Stage: Production environment
#
FROM node AS prod
ENV NODE_ENV=production

RUN echo "{\"type\": \"module\"}" > package.json
COPY --from=npm-prod /app/node_modules/ node_modules/
COPY --from=build-prod /app/dist/ dist/

HEALTHCHECK --interval=5s --timeout=1s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]
