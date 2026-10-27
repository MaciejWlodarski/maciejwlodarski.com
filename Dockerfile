FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=8810
COPY server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8810
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8810/health || exit 1
CMD ["node", "server.mjs"]
