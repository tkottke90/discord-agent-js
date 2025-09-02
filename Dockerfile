FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

COPY ./package*.json ./
RUN npm ci

COPY ./dist /app/dist

CMD ["node", "dist/index.js"]