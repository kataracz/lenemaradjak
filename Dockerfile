# Build the production dependency tree in a throwaway stage so npm — which
# vendors its own vulnerable copies of tar, ip-address and brace-expansion —
# never reaches the runtime image.
FROM node:24-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-slim
WORKDIR /app

# node:24-slim ships npm; the proxy only ever runs `node`, so drop it.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx

COPY --from=deps /app/node_modules ./node_modules
# Needed at runtime for "type": "module" — the server files are ESM.
COPY package.json ./
COPY server/ ./server/
COPY src/lib/proxy-hosts.json ./src/lib/proxy-hosts.json

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server/proxy-server.js"]
