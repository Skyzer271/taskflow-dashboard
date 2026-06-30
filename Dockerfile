# Dockerfile for Fly.io deployment
# Serves both the Express backend and the production React build from dist/.

FROM node:20-alpine

WORKDIR /app

# Install all dependencies (dev deps are needed for the Vite build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the frontend
COPY . .
RUN npm run build

# Remove dev dependencies to keep the image small
RUN npm prune --omit=dev

# Ensure the data directory exists for the SQLite volume mount
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/taskflow.db

# Seed the default admin account on container start, then start the server.
# With a persistent Fly.io volume the database survives restarts; seeding is
# idempotent and only creates the admin if it does not exist.
CMD ["sh", "-c", "npm run server:seed && npm start"]
