FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY app.py .

# Crear directorio de caché
RUN mkdir -p /tmp/segments

# Exponer puerto 7860 (requerido por Hugging Face)
EXPOSE 7860

# Variables de entorno
ENV PYTHONUNBUFFERED=1

# Comando para ejecutar la aplicación
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
