# 📸 Multiple Image & Video Upload Support for Articles

## 🔍 **Current Status**

- ❌ **No multiple image uploads** in content blocks
- ❌ **No video file uploads** in content blocks
- ✅ **Only image/video URLs** are supported
- ✅ **Single cover image upload** is supported

## 🚀 **Solution: Enhanced Article Controller**

### **1. Update Articles Controller**

Add support for multiple file uploads in the content field:

```typescript
// In articles.controller.ts - Enhanced create method
@Post()
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      content: {
        type: 'object',
        description: 'RTE content with file placeholders',
        example: {
          blocks: [
            {
              type: 'image',
              data: {
                src: 'PLACEHOLDER_IMAGE_1', // Will be replaced with uploaded file
                alt: 'Image description',
                caption: 'Image caption'
              },
              id: 'image-1'
            },
            {
              type: 'video',
              data: {
                src: 'PLACEHOLDER_VIDEO_1', // Will be replaced with uploaded file
                poster: 'PLACEHOLDER_POSTER_1', // Will be replaced with uploaded file
                caption: 'Video caption'
              },
              id: 'video-1'
            }
          ]
        }
      },
      // Multiple file upload fields
      contentImages: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: 'Multiple image files for content blocks'
      },
      contentVideos: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: 'Multiple video files for content blocks'
      },
      contentImagePosters: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: 'Poster images for video content blocks'
      },
      readMinutes: { type: 'number' },
      authorId: { type: 'string' }
    }
  }
})
async create(@Body() createArticleDto: any, @Request() req): Promise<ArticleResponse> {
  const bodyFields = (req?.body as any) || {};
  const formData: any = {};

  // Arrays to store uploaded files
  const uploadedImages: string[] = [];
  const uploadedVideos: string[] = [];
  const uploadedPosters: string[] = [];

  // Process all form fields and files
  for (const [key, value] of Object.entries(bodyFields)) {
    const v: any = value as any;

    if (v?.filename) {
      // This is a file upload
      const file: Express.Multer.File = {
        fieldname: v.fieldname,
        originalname: v.filename,
        encoding: v.encoding,
        mimetype: v.mimetype,
        size: v.file?.bytesRead || v._buf?.length || 0,
        buffer: v._buf,
        stream: v.file,
        destination: '',
        filename: v.filename,
        path: '',
      } as any;

      // Upload file and store path
      const relPath = await this.fileUploadService.uploadFile(file, 'article-content');

      // Categorize files based on field name
      if (key.startsWith('contentImages')) {
        uploadedImages.push(relPath);
      } else if (key.startsWith('contentVideos')) {
        uploadedVideos.push(relPath);
      } else if (key.startsWith('contentImagePosters')) {
        uploadedPosters.push(relPath);
      } else if (key === 'coverFile') {
        formData.coverUrl = relPath;
      }

    } else if (v?.value !== undefined) {
      // This is a form field
      const raw = v.value as string;

      if (key === 'content') {
        try {
          formData[key] = JSON.parse(raw);
        } catch (error) {
          throw new BadRequestException('Invalid RTE content JSON format');
        }
      } else {
        formData[key] = raw;
      }
    }
  }

  // Replace placeholders in content blocks with actual file paths
  if (formData.content && formData.content.blocks) {
    let imageIndex = 0;
    let videoIndex = 0;
    let posterIndex = 0;

    formData.content.blocks.forEach((block: any) => {
      if (block.type === 'image' && block.data.src.startsWith('PLACEHOLDER_IMAGE_')) {
        if (uploadedImages[imageIndex]) {
          block.data.src = uploadedImages[imageIndex];
          imageIndex++;
        }
      } else if (block.type === 'video') {
        if (block.data.src.startsWith('PLACEHOLDER_VIDEO_') && uploadedVideos[videoIndex]) {
          block.data.src = uploadedVideos[videoIndex];
          videoIndex++;
        }
        if (block.data.poster && block.data.poster.startsWith('PLACEHOLDER_POSTER_') && uploadedPosters[posterIndex]) {
          block.data.poster = uploadedPosters[posterIndex];
          posterIndex++;
        }
      }
    });
  }

  return this.articlesService.create(formData, req?.user?.id);
}
```

### **2. Update DTOs**

Add file upload fields to the DTOs:

```typescript
// In create-article.dto.ts
export class CreateArticleDto {
  // ... existing fields ...

  @ApiProperty({
    description: 'Multiple image files for content blocks',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  contentImages?: Express.Multer.File[];

  @ApiProperty({
    description: 'Multiple video files for content blocks',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  contentVideos?: Express.Multer.File[];

  @ApiProperty({
    description: 'Poster images for video content blocks',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  contentImagePosters?: Express.Multer.File[];
}
```

### **3. Usage Examples**

#### **Frontend JavaScript Example:**

```javascript
// Create FormData with multiple files
const formData = new FormData();

// Article metadata
formData.append('title', 'Article with Multiple Media');
formData.append('summary', 'This article contains multiple images and videos');
formData.append('readMinutes', '10');
formData.append('authorId', 'author-id-here');

// Content with placeholders
formData.append(
  'content',
  JSON.stringify({
    blocks: [
      {
        type: 'heading',
        data: { text: 'Introduction', level: 2 },
        id: 'heading-1',
      },
      {
        type: 'image',
        data: {
          src: 'PLACEHOLDER_IMAGE_1',
          alt: 'First image',
          caption: 'First uploaded image',
        },
        id: 'image-1',
      },
      {
        type: 'image',
        data: {
          src: 'PLACEHOLDER_IMAGE_2',
          alt: 'Second image',
          caption: 'Second uploaded image',
        },
        id: 'image-2',
      },
      {
        type: 'video',
        data: {
          src: 'PLACEHOLDER_VIDEO_1',
          poster: 'PLACEHOLDER_POSTER_1',
          caption: 'First uploaded video',
        },
        id: 'video-1',
      },
      {
        type: 'paragraph',
        data: { text: 'This is a paragraph with rich content...' },
        id: 'paragraph-1',
      },
    ],
    version: '1.0',
    lastModified: new Date().toISOString(),
  }),
);

// Upload multiple files
formData.append('contentImages', imageFile1);
formData.append('contentImages', imageFile2);
formData.append('contentVideos', videoFile1);
formData.append('contentImagePosters', posterFile1);

// Send request
fetch('/api/articles', {
  method: 'POST',
  body: formData,
});
```

#### **React Example:**

```jsx
import React, { useState } from 'react';

function ArticleForm() {
  const [files, setFiles] = useState({
    images: [],
    videos: [],
    posters: [],
  });

  const handleFileChange = (type, fileList) => {
    setFiles(prev => ({
      ...prev,
      [type]: Array.from(fileList),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const formData = new FormData();

    // Add article data
    formData.append('title', 'Article with Multiple Media');
    formData.append('summary', 'This article contains multiple images and videos');
    formData.append('readMinutes', '10');
    formData.append('authorId', 'author-id-here');

    // Add content with placeholders
    formData.append(
      'content',
      JSON.stringify({
        blocks: [
          {
            type: 'image',
            data: {
              src: 'PLACEHOLDER_IMAGE_1',
              alt: 'First image',
              caption: 'First uploaded image',
            },
            id: 'image-1',
          },
          {
            type: 'video',
            data: {
              src: 'PLACEHOLDER_VIDEO_1',
              poster: 'PLACEHOLDER_POSTER_1',
              caption: 'First uploaded video',
            },
            id: 'video-1',
          },
        ],
        version: '1.0',
        lastModified: new Date().toISOString(),
      }),
    );

    // Add files
    files.images.forEach((file, index) => {
      formData.append(`contentImages`, file);
    });

    files.videos.forEach((file, index) => {
      formData.append(`contentVideos`, file);
    });

    files.posters.forEach((file, index) => {
      formData.append(`contentImagePosters`, file);
    });

    // Submit
    const response = await fetch('/api/articles', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Article created:', result);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Images:</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={e => handleFileChange('images', e.target.files)}
        />
      </div>

      <div>
        <label>Videos:</label>
        <input
          type="file"
          multiple
          accept="video/*"
          onChange={e => handleFileChange('videos', e.target.files)}
        />
      </div>

      <div>
        <label>Video Posters:</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={e => handleFileChange('posters', e.target.files)}
        />
      </div>

      <button type="submit">Create Article</button>
    </form>
  );
}
```

### **4. Database Storage**

The uploaded files will be stored in the content field as:

```json
{
  "content": {
    "blocks": [
      {
        "type": "image",
        "data": {
          "src": "/uploads/article-content/image1.jpg",
          "alt": "First image",
          "caption": "First uploaded image"
        },
        "id": "image-1"
      },
      {
        "type": "video",
        "data": {
          "src": "/uploads/article-content/video1.mp4",
          "poster": "/uploads/article-content/poster1.jpg",
          "caption": "First uploaded video"
        },
        "id": "video-1"
      }
    ],
    "version": "1.0",
    "lastModified": "2024-01-15T10:30:00Z"
  }
}
```

## 🎯 **Benefits**

- ✅ **Multiple image uploads** in content blocks
- ✅ **Video file uploads** in content blocks
- ✅ **Poster image uploads** for videos
- ✅ **Flexible content structure** with RTE
- ✅ **File management** with proper paths
- ✅ **Backwards compatibility** with existing articles

## 📝 **Implementation Steps**

1. **Update Articles Controller** with enhanced file handling
2. **Update DTOs** to include file upload fields
3. **Test with multiple files** using the examples above
4. **Update frontend** to support multiple file uploads
5. **Add file validation** (size, type, etc.)

This solution provides full support for multiple image and video uploads within the article content field! 🚀
