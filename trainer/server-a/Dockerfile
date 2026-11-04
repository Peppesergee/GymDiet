# Architettura A in un solo container. Da costruire dalla cartella trainer/:
#   docker build -f server-a/Dockerfile -t gymcoach-a .
#   docker run -p 8080:8080 -v gymcoach-dati:/data -e ANTHROPIC_API_KEY=... gymcoach-a
FROM node:22-slim
WORKDIR /app
COPY server-a/package.json server-a/package-lock.json server-a/
RUN cd server-a && npm ci --omit=dev
COPY shared shared
COPY web web
COPY server-a/schema.sql server-a/
COPY server-a/src server-a/src
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/gymcoach.db COOKIE_SECURE=1
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "server-a/src/server.js"]
