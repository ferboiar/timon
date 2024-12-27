FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

#comento pq docker-compose.yml ya monta el código fuente en /app
#COPY . .

# redunda lo que ya viene en el docker-compose.yml
#CMD ["npm", "run", "dev"]
