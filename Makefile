.PHONY: dev build start install db-generate db-migrate db-push db-studio lint format

# Start development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Start production server
start:
	npm run start

# Install dependencies
install:
	npm install

# Database - Generate migrations
db-generate:
	npm run db:generate

# Database - Run migrations
db-migrate:
	npm run db:migrate

# Database - Push schema directly (dev only)
db-push:
	npm run db:push

# Database - Open Drizzle Studio
db-studio:
	npm run db:studio

# Run linter
lint:
	npm run lint

# Format code
format:
	npm run format
