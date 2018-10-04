FROM node:10-alpine as builder
WORKDIR /home/node/app

COPY ./package* ./
RUN npm install

COPY ./ ./
RUN npm run build && npm test

FROM node:10-alpine
ENV NODE_ENV=production
WORKDIR /home/node/app

COPY ./package* ./
#RUN npm install && \
#    npm cache clean --force

COPY --from=builder /home/node/app/node_modules/ ./node_modules/
COPY --from=builder /home/node/app/build/ ./build/

USER node
CMD npm start
