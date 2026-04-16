# Imagen base de Python
FROM python:3.10-slim

# Evitar que Python genere archivos .pyc y habilitar logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias de Python
# Nota: Ahora los buscamos dentro de la carpeta backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar TODO el código del backend a la raíz /app
COPY backend/ .

# Exponer el puerto
EXPOSE 8000

# Variables de entorno por defecto para modo local
ENV DATABASE_MODE=local

# Comando para iniciar la aplicación
CMD ["python", "main.py"]
