# HurriJewels Backend

A modern, scalable backend API built with **NestJS + Fastify + PostgreSQL + Prisma ORM** for the HurriJewels jewelry e-commerce platform.

## 🚀 Features

- **Modern Architecture**: Built with NestJS framework using TypeScript
- **High Performance**: Fastify as the HTTP server for optimal performance
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations
- **Authentication**: JWT-based authentication with role-based access control
- **Blog System**: Complete blog/articles portal with engagement features
- **Search**: Full-text search across articles, categories, and tags
- **Engagement**: Views, likes, bookmarks, and newsletter subscriptions
- **Validation**: Request validation using class-validator and DTOs
- **Documentation**: Auto-generated API documentation with Swagger
- **Testing**: Jest testing framework with comprehensive test coverage
- **Security**: Built-in security features (CORS, Helmet, Rate Limiting)
- **Logging**: Winston-based logging with file rotation
- **File Uploads**: Multer integration for file handling
- **Background Jobs**: Bull queue integration for async processing

## 🏗️ Project Structure

```
src/
├── common/                    # Shared modules and utilities
│   ├── database/             # Database configuration and Prisma service
│   ├── logger/               # Winston logging service
│   ├── email/                # Email service (Nodemailer)
│   ├── file-upload/          # File upload handling
│   ├── health/               # Health check endpoints
│   ├── filters/              # Global exception filters
│   └── interceptors/         # Request/response interceptors
├── config/                   # Configuration management
├── modules/                  # Feature modules
│   ├── auth/                 # Authentication and authorization
│   ├── users/                # User management
│   ├── vendors/              # Vendor management
│   ├── products/             # Product catalog
│   ├── orders/               # Order management
│   ├── payments/             # Payment processing
│   ├── ai/                   # AI services (design, try-on, etc.)
│   ├── shipping/             # Shipping and delivery
│   ├── admin/                # Admin dashboard and analytics
│   ├── articles/             # Blog articles and content management
│   ├── engagement/           # User engagement (views, likes, bookmarks)
│   └── search/               # Search functionality
└── main.ts                   # Application entry point
```

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **HTTP Server**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma 5.x
- **Authentication**: JWT + Passport
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Logging**: Winston (with file rotation)
- **File Uploads**: Multer
- **Background Jobs**: Bull + Redis
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for background jobs)
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd hurrijewels-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/hurrijewels?schema=public"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Add other required environment variables...
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed the database
npm run db:seed

# Seed blog data specifically
npm run db:seed:blog
```

### 5. Start the application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

The API will be available at `http://localhost:3000/api`

### Structured logging (Winston)

Logs are written to console and rotated files under `logs/`:

- `logs/app-%DATE%.log` (info and above, retained 14 days)
- `logs/error-%DATE%.log` (errors only, retained 30 days)

Environment variables:

```env
LOG_LEVEL=info
LOG_FULL_BODY=false
LOG_PRISMA_QUERIES=false
LOG_FILE_PATH=./logs
```

Notes:

- Full request/response bodies are not logged unless `LOG_FULL_BODY=true`.
- Prisma SQL text is not logged by default; enable with `LOG_PRISMA_QUERIES=true`.

## 📚 API Documentation

Once the application is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api`

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: Customer accounts with role-based access
- **Vendors**: Business profiles for product sellers
- **Products**: Jewelry catalog with categories and attributes
- **Orders**: Order management with status tracking
- **Payments**: Payment processing and history
- **Shipping**: Delivery and shipping management
- **Reviews**: Product ratings and feedback
- **AI Models**: AI service configurations

### Blog System Schema

The blog system includes the following entities:

- **Articles**: Blog posts with content, metadata, and engagement metrics
- **Authors**: Content creators linked to user accounts
- **ArticleCategories**: Content categorization (Technology, Fashion, etc.)
- **ArticleTags**: Content tagging system for better discoverability
- **ViewEvents**: Track article views with IP-based deduplication
- **Likes**: User likes on articles and other entities
- **Bookmarks**: User bookmarks for saving content
- **NewsletterSignups**: Email subscription management

## 📝 Blog System Features

The HurriJewels backend includes a comprehensive blog system designed for content marketing and customer engagement:

### Article Management

- **CRUD Operations**: Create, read, update, and delete articles
- **Rich Content**: Support for HTML/Markdown content with excerpts
- **SEO Optimization**: Auto-generated slugs and meta descriptions
- **Status Management**: Draft, Published, and Archived states
- **Featured Articles**: Highlight important content
- **Reading Time**: Automatic calculation based on content length

### Content Organization

- **Categories**: Hierarchical content organization
- **Tags**: Flexible tagging system for content discovery
- **Authors**: Multi-author support with user linking
- **Slugs**: SEO-friendly URLs for all content

### Engagement Features

- **View Tracking**: IP-based view counting with deduplication
- **Like System**: User likes with real-time counters
- **Bookmarks**: Save articles for later reading
- **Newsletter**: Email subscription management

### Search & Discovery

- **Full-Text Search**: Search across articles, categories, and tags
- **Filtering**: Filter by category, tag, reading time, and more
- **Sorting**: Sort by latest, popular, or featured
- **Trending Topics**: Discover popular categories and tags
- **Search Suggestions**: Auto-complete for search queries

### API Endpoints

#### Public Endpoints

- `GET /articles` - List articles with pagination and filters
- `GET /articles/featured` - Get featured articles
- `GET /articles/recent` - Get recent articles
- `GET /articles/popular` - Get popular articles (last 30 days)
- `GET /articles/:slug` - Get article by slug
- `GET /article-categories` - List all categories
- `GET /article-tags` - List all tags
- `GET /authors` - List all authors
- `GET /search` - Search articles, categories, and tags
- `GET /search/suggestions` - Get search suggestions
- `GET /engagement/trending-topics` - Get trending topics

#### Engagement Endpoints

- `POST /engagement/view` - Track article view
- `POST /engagement/like` - Like/unlike article
- `POST /engagement/bookmark` - Bookmark/unbookmark article
- `GET /engagement/likes` - Get user likes (authenticated)
- `GET /engagement/bookmarks` - Get user bookmarks (authenticated)
- `POST /newsletter/subscribe` - Subscribe to newsletter

#### Admin/Editor Endpoints (Authentication Required)

- `POST /articles` - Create new article
- `PATCH /articles/:id` - Update article
- `DELETE /articles/:id` - Delete article
- `POST /article-categories` - Create category
- `PATCH /article-categories/:id` - Update category
- `DELETE /article-categories/:id` - Delete category
- `POST /article-tags` - Create tag
- `PATCH /article-tags/:id` - Update tag
- `DELETE /article-tags/:id` - Delete tag
- `POST /authors` - Create author
- `PATCH /authors/:id` - Update author
- `DELETE /authors/:id` - Delete author

### Role-Based Access Control

- **SUPER_ADMIN**: Full access to all blog features
- **ADMIN**: Full access to all blog features
- **MANAGER**: Limited access (can be extended)
- **VENDOR**: No blog access by default
- **USER**: Read-only access + engagement actions (like, bookmark, newsletter)

### Sample Blog Data

The system includes a comprehensive seed script that creates:

- 2 authors (linked to existing users)
- 6 article categories
- 8 article tags
- 12 sample articles with varied content
- Sample engagement data (views, likes)
- Newsletter subscriptions

To populate the blog with sample data:

```bash
npm run db:seed:blog
```

## 🔐 Authentication & Authorization

The API implements JWT-based authentication with role-based access control:

- **SUPER_ADMIN**: Full system access and management
- **ADMIN**: Full system access and management
- **MANAGER**: Limited administrative access
- **VENDOR**: Product management and order fulfillment
- **USER**: Basic user access (formerly CUSTOMER)

## 📁 File Uploads

File uploads are handled through the `/uploads` endpoint with support for:

- Image files (jewelry photos, user avatars)
- Document files (product specifications, invoices)
- Configurable file size limits and type validation

## 🚀 Deployment

### Docker (Recommended)

```bash
# Build the image
docker build -t hurrijewels-backend .

# Run the container
docker run -p 3000:3000 hurrijewels-backend
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## 📝 Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data
- `npm run db:seed:blog` - Seed database with blog sample data
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/docs`

## 🔄 Migration from Express.js

This project is a complete rebuild of the original Express.js + MongoDB backend. Key changes include:

- **Database**: MongoDB → PostgreSQL with Prisma ORM
- **Framework**: Express.js → NestJS
- **Server**: HTTP → Fastify
- **Architecture**: Monolithic → Modular NestJS architecture
- **Validation**: express-validator → class-validator
- **Type Safety**: JavaScript → TypeScript
- **Testing**: Basic testing → Comprehensive Jest testing

---

**Built with ❤️ by the HurriJewels Development Team**
