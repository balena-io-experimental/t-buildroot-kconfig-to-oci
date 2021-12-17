FROM node:16

WORKDIR /usr/src/transformer

ENV INPUT=
ENV OUTPUT=

# improve docker caching by adding these two separately
COPY package.json package-lock.json ./
RUN npm ci

# use the below version if you un-commented the token secret in the balena.yml
#RUN --mount=type=secret,id=NPM_TOKEN \
#	echo "//registry.npmjs.org/:_authToken=$(cat /run/secrets/NPM_TOKEN)" > ~/.npmrc && \
#	npm ci && \
#	rm -f ~/.npmrc

COPY . ./
RUN npm run build

ENTRYPOINT [ "./scripts/entrypoint.sh" ]
