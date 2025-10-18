# Use Node.js image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
COPY package*.json ./
    
# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build frontend (Vite)
RUN npm run build

# Expose port for Cloud Run
ENV PORT 8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
