###############################################
# Frontend Image
###############################################
FROM node:22-alpine as production-frontend

WORKDIR /app

COPY ["./package.json", "./package-lock.json*", "./"]
RUN npm install --ignore-scripts

COPY . .

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm","run","serve"]
