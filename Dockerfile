FROM node:10-alpine as builder
WORKDIR /home/node/app

COPY ./package* ./
RUN npm install

COPY ./ ./
RUN npm test && npm run build

FROM node:10-alpine
ENV NODE_ENV=production
WORKDIR /home/node/app

COPY ./package* ./
COPY --from=builder /home/node/app/node_modules/ ./node_modules/
COPY --from=builder /home/node/app/build/ ./build/

# add navs webproxy cert
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*
COPY ./webproxynavno.crt /usr/local/share/ca-certificates/webproxynavno.crt
RUN update-ca-certificates

# node user is added by the base image
USER node
CMD npm start
