FROM node:22-bookworm-slim
WORKDIR /app

COPY docs/server/package.json \
     docs/server/package-lock.json ./
RUN npm ci

COPY docs/server/src/ .

CMD ["npm", "run", "dev"]