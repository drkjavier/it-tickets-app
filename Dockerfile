# IT Tickets - Dokploy Deployment
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm@9

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npx next build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3007
ENV HOSTNAME="0.0.0.0"

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy package files for production deps
COPY package.json pnpm-lock.yaml ./

# Copy public folder
COPY public ./public

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3007

# Start the application
CMD ["node", "server.js"]

