FROM node:20-alpine

WORKDIR /frontend
RUN echo "--- REVISANDO contenido de /app ---"
RUN ls -l

COPY package*.json ./
RUN pwd
RUN ls -la -R
RUN echo "--- INICIANDO npm install ---"
RUN npm install --verbose

RUN echo "--- COPIANDO repositorio ---"
COPY . .

RUN echo "--- REVISANDO contenido de /app II ---"
RUN ls -la -R

CMD ["npm", "run", "dev"]
