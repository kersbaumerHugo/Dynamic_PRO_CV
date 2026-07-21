FROM mcr.microsoft.com/playwright:latest

# Working directory
WORKDIR /workspace

# Copy package manifests first to leverage layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# Copy project
COPY . ./

# Install browsers (image usually includes them, but ensure)
RUN npx playwright install --with-deps || true

# Build static site
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "dev"]
