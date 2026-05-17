FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install

COPY . .
RUN npm run build -w client \
  && npm run db:generate -w server \
  && npm run build -w server

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/index.js"]
