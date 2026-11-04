# Architettura A in un solo container, senza dipendenze npm. Dalla cartella trainer/:
#   docker build -f server-a/Dockerfile -t gymcoach-a .
#   docker run -p 8080:8080 -v gymcoach-dati:/data gymcoach-a
FROM node:22-slim
WORKDIR /app
COPY shared shared
COPY web web
COPY server-a/package.json server-a/schema.sql server-a/
COPY server-a/src server-a/src
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/gymcoach.db COOKIE_SECURE=1
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "server-a/src/server.js"]
