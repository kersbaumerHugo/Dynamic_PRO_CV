FROM mcr.microsoft.com/playwright:latest

# Working directory
WORKDIR /workspace

# Copy package manifests first to leverage layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy project
COPY . ./

# Install browsers (image usually includes them, but ensure)
RUN npx playwright install --with-deps || true

# Build static site
RUN npm run build || true

EXPOSE 8080

CMD ["npm", "run", "dev"]
