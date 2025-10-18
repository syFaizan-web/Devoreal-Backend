# 📝 Article Storage Guide - Complete Documentation

This guide shows you how to store articles using the new RTE (Rich Text Editor) structure in your NestJS + Prisma + PostgreSQL application.

## 🏗️ Database Schema

Your articles are stored with the following structure:

```prisma
model Article {
  id            String        @id @default(cuid())
  authorId      String
  title         String
  slug          String        @unique
  summary       String?       @db.Text  // Short summary/excerpt
  content       Json          // Rich Text Editor JSON structure
  coverUrl      String?
  coverAlt      String?
  readMinutes   Int
  isFeatured    Boolean       @default(false)
  status        ArticleStatus @default(DRAFT)
  viewsCount    Int           @default(0)
  likesCount    Int           @default(0)
  // SEO fields
  metaTitle       String?
  metaDescription String?
  metaImageUrl    String?
  language        String?     @default("en")
  isActive      Boolean       @default(true)
  isDeleted     Boolean       @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  publishedAt   DateTime     @default(now())
  createdBy     String?
  updatedBy     String?
  // Relations
  author        Author        @relation(fields: [authorId], references: [id])
  categories    ArticleOnCategories[]
  tags          ArticleOnTags[]
}
```

## 🚀 API Endpoints

### 1. **POST /api/articles** - Create Article

**Content-Type:** `application/json`

**Required Fields:**

- `title` (string)
- `summary` (string)
- `content` (object)
- `readMinutes` (number)
- `authorId` (string)

**Optional Fields:**

- `slug` (string) - Auto-generated from title if not provided
- `coverUrl` (string)
- `coverAlt` (string)
- `isFeatured` (boolean)
- `status` (string: DRAFT, PUBLISHED, ARCHIVED)
- `metaTitle` (string)
- `metaDescription` (string)
- `metaImageUrl` (string)
- `language` (string)

### 2. **PATCH /api/articles/:id** - Update Article

**Content-Type:** `application/json`

All fields are optional for updates.

### 3. **GET /api/articles** - Get All Articles

Returns paginated list of articles.

### 4. **GET /api/articles/:slug** - Get Single Article

Returns complete article details by slug.

## 📋 Content Structure

The `content` field uses a JSON structure with blocks:

```json
{
  "blocks": [
    {
      "type": "heading",
      "data": { "text": "Introduction", "level": 2 },
      "id": "heading-1"
    },
    {
      "type": "paragraph",
      "data": { "text": "Article content here..." },
      "id": "paragraph-1"
    }
  ],
  "version": "1.0",
  "lastModified": "2024-01-15T10:30:00Z"
}
```

## 🎨 Supported Content Block Types

### 1. **Heading**

```json
{
  "type": "heading",
  "data": { "text": "Heading Text", "level": 2 },
  "id": "unique-id"
}
```

- `level`: 1-6 (H1 to H6)

### 2. **Paragraph**

```json
{
  "type": "paragraph",
  "data": { "text": "Paragraph content here..." },
  "id": "unique-id"
}
```

### 3. **Image**

```json
{
  "type": "image",
  "data": {
    "src": "https://example.com/image.jpg",
    "alt": "Image description",
    "caption": "Optional caption"
  },
  "id": "unique-id"
}
```

### 4. **Video**

```json
{
  "type": "video",
  "data": {
    "src": "https://example.com/video.mp4",
    "poster": "https://example.com/poster.jpg",
    "caption": "Optional caption"
  },
  "id": "unique-id"
}
```

### 5. **List**

```json
{
  "type": "list",
  "data": {
    "style": "ordered", // or "unordered"
    "items": ["Item 1", "Item 2", "Item 3"]
  },
  "id": "unique-id"
}
```

### 6. **Quote**

```json
{
  "type": "quote",
  "data": {
    "text": "Quote text here",
    "caption": "Optional attribution"
  },
  "id": "unique-id"
}
```

### 7. **Table**

```json
{
  "type": "table",
  "data": {
    "headers": ["Header 1", "Header 2"],
    "rows": [
      ["Row 1 Col 1", "Row 1 Col 2"],
      ["Row 2 Col 1", "Row 2 Col 2"]
    ]
  },
  "id": "unique-id"
}
```

### 8. **Link**

```json
{
  "type": "link",
  "data": {
    "url": "https://example.com",
    "text": "Link text",
    "target": "_blank" // optional
  },
  "id": "unique-id"
}
```

## 💡 Complete Example

### Basic Article

```json
{
  "title": "The Ultimate Guide to Diamond Engagement Rings",
  "slug": "ultimate-guide-diamond-engagement-rings",
  "summary": "Discover everything you need to know about choosing the perfect diamond engagement ring, from the 4Cs to setting styles and budget considerations.",
  "content": {
    "blocks": [
      {
        "type": "heading",
        "data": { "text": "Introduction", "level": 2 },
        "id": "heading-1"
      },
      {
        "type": "paragraph",
        "data": {
          "text": "Choosing an engagement ring is one of the most important decisions you'll make. This comprehensive guide will help you understand everything about diamond engagement rings."
        },
        "id": "paragraph-1"
      },
      {
        "type": "heading",
        "data": { "text": "Understanding the 4Cs", "level": 3 },
        "id": "heading-2"
      },
      {
        "type": "paragraph",
        "data": {
          "text": "The 4Cs are the universal standard for evaluating diamonds: Cut, Color, Clarity, and Carat weight."
        },
        "id": "paragraph-2"
      }
    ],
    "version": "1.0",
    "lastModified": "2024-01-15T10:30:00Z"
  },
  "readMinutes": 8,
  "isFeatured": true,
  "status": "PUBLISHED",
  "metaTitle": "Ultimate Guide to Diamond Engagement Rings 2024",
  "metaDescription": "Complete guide to choosing diamond engagement rings. Learn about 4Cs, settings, and budget tips.",
  "metaImageUrl": "https://example.com/diamond-ring-guide.jpg",
  "language": "en",
  "authorId": "author-id-here"
}
```

### Complex Article with Multiple Content Types

```json
{
  "title": "Sustainable Jewelry: The Future of Ethical Fashion",
  "slug": "sustainable-jewelry-ethical-fashion-future",
  "summary": "Explore how sustainable jewelry practices are revolutionizing the fashion industry, from eco-friendly materials to ethical sourcing and circular design principles.",
  "content": {
    "blocks": [
      {
        "type": "heading",
        "data": { "text": "The Rise of Sustainable Jewelry", "level": 2 },
        "id": "heading-1"
      },
      {
        "type": "paragraph",
        "data": {
          "text": "The jewelry industry is undergoing a significant transformation as consumers become more conscious about environmental and social impact."
        },
        "id": "paragraph-1"
      },
      {
        "type": "image",
        "data": {
          "src": "https://example.com/sustainable-jewelry.jpg",
          "alt": "Sustainable jewelry collection",
          "caption": "Eco-friendly jewelry made from recycled materials"
        },
        "id": "image-1"
      },
      {
        "type": "heading",
        "data": { "text": "Key Sustainable Practices", "level": 3 },
        "id": "heading-2"
      },
      {
        "type": "list",
        "data": {
          "style": "unordered",
          "items": [
            "Recycled precious metals",
            "Lab-grown diamonds",
            "Ethical gemstone sourcing",
            "Carbon-neutral production",
            "Biodegradable packaging"
          ]
        },
        "id": "list-1"
      },
      {
        "type": "quote",
        "data": {
          "text": "Sustainability is not just about the environment; it's about creating a better future for everyone involved in the jewelry supply chain.",
          "caption": "Sarah Johnson, Sustainable Jewelry Designer"
        },
        "id": "quote-1"
      },
      {
        "type": "table",
        "data": {
          "headers": ["Practice", "Environmental Impact", "Social Impact"],
          "rows": [
            ["Recycled Metals", "Reduces mining", "Supports recycling industry"],
            ["Lab-Grown Diamonds", "No mining required", "Creates tech jobs"],
            ["Ethical Sourcing", "Protects ecosystems", "Fair wages for miners"]
          ]
        },
        "id": "table-1"
      }
    ],
    "version": "1.2",
    "lastModified": "2024-01-15T14:45:00Z"
  },
  "readMinutes": 12,
  "isFeatured": true,
  "status": "PUBLISHED",
  "metaTitle": "Sustainable Jewelry: Ethical Fashion Future 2024",
  "metaDescription": "Discover how sustainable jewelry practices are changing the fashion industry with eco-friendly materials and ethical sourcing.",
  "metaImageUrl": "https://example.com/sustainable-jewelry-meta.jpg",
  "language": "en",
  "authorId": "author-id-here"
}
```

## 🔧 Usage Examples

### Create Article

```javascript
const response = await fetch('http://localhost:5000/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(articleData),
});

const result = await response.json();
```

### Update Article

```javascript
const response = await fetch(`http://localhost:5000/api/articles/${articleId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData),
});

const result = await response.json();
```

### Get All Articles

```javascript
const response = await fetch('http://localhost:5000/api/articles');
const result = await response.json();
```

### Get Single Article

```javascript
const response = await fetch(`http://localhost:5000/api/articles/${slug}`);
const result = await response.json();
```

## 📊 Response Format

### Article Response

```json
{
  "id": "article-id",
  "title": "Article Title",
  "summary": "Short summary/excerpt",
  "content": {
    "blocks": [...],
    "version": "1.0",
    "lastModified": "2024-01-15T10:30:00Z"
  },
  "slug": "article-slug",
  "coverUrl": "https://example.com/cover.jpg",
  "coverAlt": "Cover image description",
  "author": {
    "id": "author-id",
    "displayName": "Author Name",
    "bio": "Author bio",
    "avatarUrl": "https://example.com/avatar.jpg",
    "userId": "user-id"
  },
  "readMinutes": 8,
  "viewsCount": 1250,
  "likesCount": 89,
  "publishedAt": "2024-01-15T10:30:00Z",
  "categories": [...],
  "tags": [...],
  "isFeatured": true,
  "status": "PUBLISHED",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO Description",
  "metaImageUrl": "https://example.com/meta-image.jpg",
  "language": "en",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Paginated Articles Response

```json
{
  "data": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "hasNext": true,
  "hasPrev": false
}
```

## 🎯 Best Practices

1. **Always include unique IDs** for content blocks
2. **Use semantic HTML levels** for headings (1-6)
3. **Provide alt text** for images
4. **Keep summaries concise** (under 500 characters)
5. **Use descriptive slugs** for SEO
6. **Include meta information** for better SEO
7. **Version your content** for tracking changes
8. **Use consistent block IDs** for referencing

## 🚀 Testing

Run the provided examples to test the endpoints:

```bash
node article-examples.js
```

This will create, update, and retrieve articles using the new RTE structure.

## 📝 Notes

- **Authentication**: POST and PATCH endpoints require authentication
- **File Uploads**: Use `multipart/form-data` for file uploads
- **Validation**: All fields are validated according to the DTOs
- **SEO**: Meta fields are automatically used for SEO optimization
- **Slugs**: Auto-generated from title if not provided
- **Status**: Defaults to DRAFT, can be PUBLISHED or ARCHIVED

Your RTE editor can now easily work with this clean, separated structure! 🎉
