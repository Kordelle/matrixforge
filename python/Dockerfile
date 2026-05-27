FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate the ~25k SKU seed file at build time (pure Python, no network deps)
RUN mkdir -p data && python generate_catalog.py

EXPOSE 7431

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7431"]
