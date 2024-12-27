FROM node:20-alpine

WORKDIR /frontend
RUN echo "--- REVISANDO contenido de /app ---"
RUN ls -l

COPY package*.json ./
RUN ls -l
RUN echo "--- INICIANDO npm install ---"
RUN npm install --verbose

RUN echo "--- COPIANDO repositorio ---"
COPY . .

RUN echo "--- REVISANDO contenido de /app II ---"
RUN ls -l

CMD ["npm", "run", "dev"]
