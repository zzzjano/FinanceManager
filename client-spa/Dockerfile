# Build stage
FROM node:18-alpine AS builder

# Ustawienie katalogu roboczego
WORKDIR /app

# Kopiowanie plików package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności
RUN npm ci && npm cache clean --force

# Kopiowanie kodu źródłowego
COPY . .

# Budowanie aplikacji
RUN npm run build

# Production stage
FROM nginx:1.23-alpine AS production

# Kopiowanie plików statycznych z etapu budowania
COPY --from=builder /app/build /usr/share/nginx/html

# Kopiowanie konfiguracji Nginx
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Ustawienie uprawnień
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Ustawienie portu
EXPOSE 80

# Uruchomienie Nginx jako non-root user
USER nginx

# Uruchomienie Nginx
CMD ["nginx", "-g", "daemon off;"]
