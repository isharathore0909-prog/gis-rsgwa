# Step 1: Build the React application
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

COPY --from=build /app/dist ./dist

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["serve","-s","dist","-l","80"]
