FROM node:22-bookworm-slim

# Install build tools required for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npx", "tsx", "server.ts"]
