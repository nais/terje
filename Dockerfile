FROM node:10-alpine as builder
WORKDIR /home/node/app

COPY . ./
RUN npm install && npm run build && npm test

FROM node:10-alpine
ENV NODE_ENV=production
WORKDIR /home/node/app

COPY ./package* ./
RUN npm install && \
    npm cache clean --force

COPY --from=builder /home/node/app/build/ ./build/


CMD npm start
