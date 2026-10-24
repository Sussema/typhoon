FROM node:22-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source, migrations, and scripts
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

ENV NODE_ENV=production
USER node
EXPOSE 5000

CMD ["node", "src/server.js"]
