FROM node:20-bullseye
RUN apt-get update --fix-missing && apt-get install -y --fix-missing --no-install-recommends \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    librsvg2-dev \
    pkg-config \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "index.js"]
