# STAGE 1: Build dell'applicazione Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copia i file delle dipendenze e installa
COPY package*.json ./
RUN npm install

# Copia il codice sorgente e compila il progetto
COPY . .
RUN npm run build -- --configuration production

# STAGE 2: Servizio dei file statici tramite Nginx
FROM nginx:alpine

# Copia i file compilati dallo STAGE 1 nella cartella pubblica di Nginx
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Espone la porta standard HTTP
EXPOSE 80

# Avvia Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
