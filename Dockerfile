FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server/package*.json ./server/
RUN cd server && npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

ENV PORT=8080

CMD ["node","server/index.js"]