FROM node:10-alpine as builder

WORKDIR /build/

ADD ./package.json /build/
RUN yarn

ADD ./src /build/src
ADD ./tsconfig.json /build/

RUN yarn build
RUN yarn jest

FROM node:10-alpine

COPY --from=builder /build/dist /app/

CMD ["node", "/app/app.js"]
