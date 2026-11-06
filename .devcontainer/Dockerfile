FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Actualiza los repositorios e instala el cliente de MySQL y git-crypt (S-09, DC-45).
# git-crypt se instala sin versión fijada (la última del repositorio apt de la imagen).
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install default-mysql-client git-crypt \
    && rm -rf /var/lib/apt/lists/*

# Opcional: Instala otras dependencias del sistema si las necesitas. Por ejemplo, para Python:
# RUN apt-get -y install python3 python3-pip

# Opcional: Copia archivos de configuración o scripts a tu contenedor.
# COPY .myconfig /home/node/.myconfig

# Opcional: Define un usuario no root para mayor seguridad.
# USER node
