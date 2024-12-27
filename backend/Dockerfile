FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Actualiza los repositorios e instala el cliente de MySQL
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
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

# Opcional: Instala otras dependencias del sistema si las necesitas. Por ejemplo, para Python:
# RUN apt-get -y install python3 python3-pip

# Opcional: Copia archivos de configuración o scripts a tu contenedor.
# COPY .myconfig /home/node/.myconfig

# Opcional: Define un usuario no root para mayor seguridad.
# USER node
