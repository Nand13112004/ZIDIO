FROM node:20-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S intellmeet && adduser -S intellmeet -G intellmeet

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN mkdir -p logs && chown -R intellmeet:intellmeet /app

USER intellmeet
EXPOSE 5000

CMD ["node", "server.js"]
