# Use a lightweight Nginx image
FROM nginx:stable-alpine

# Copy all files to the default nginx public folder
COPY . /usr/share/nginx/html

# Cloud Run listens on port 8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
