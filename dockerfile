FROM node:10.17
RUN apt-get update && apt-get upgrade -y && apt-get install -y apt-utils unattended-upgrades \
    libsasl2-dev libssl-dev libxml2-dev nano && \
    rm -rf /var/lib/apt/lists/* && \
    unattended-upgrades -d && \
    npm i -g yarn
RUN apt-get remove git -y
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN mkdir /app/config
RUN rm -rf /app/outputData
COPY env.properties /app/config/
RUN cd /app/dist/bin/ && cp -a ./index-bundle.js /app/
RUN cd /app/ && cp -a ./index-bundle.js /tmp/
RUN cd /app/ && cp -a ./package.json /tmp/
RUN cd /app/ && cp -a ./config /tmp/
RUN cd /app/ && cp -a ./bundle /tmp/
RUN cd /app/ && cp -a ./node_modules /tmp/
RUN rm -rf ./*
RUN mkdir /app/outputData
RUN cd /etc/ && rm -rf mysql
RUN cd /tmp/ && cp -a ./* /app/
ENTRYPOINT ["node", "index-bundle.js"]