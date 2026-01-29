
# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (cache optimization)
COPY package*.json ./

# Install dependencies in the container
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "dev"]
