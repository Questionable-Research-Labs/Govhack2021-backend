FROM node:alpine

WORKDIR /app

COPY package.json .

COPY yarn.lock .

COPY . .

RUN yarn

RUN yarn build

EXPOSE 5000

CMD ["node", "dist/index.js"]