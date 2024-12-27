FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

#comento pq docker-compose.yml ya monta el código fuente en /app
#COPY . .

CMD ["npm", "run", "dev"]
