FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY src/lib/proxy-hosts.json ./src/lib/proxy-hosts.json

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server/proxy-server.js"]
