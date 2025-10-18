import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    try {
      // Validate file
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Validate file size
      const maxFileSize = this.configService.get('MAX_FILE_SIZE', 10485760); // 10MB default
      if (file.size > maxFileSize) {
        throw new BadRequestException(`File size exceeds maximum limit of ${maxFileSize} bytes`);
      }

      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/flv',
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
      }

      // Create upload directory if it doesn't exist
      const uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
      const folderPath = path.join(uploadPath, folder);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Return relative path for database storage
      const relativePath = path.join(folder, fileName).replace(/\\/g, '/');
      
      this.logger.log(`File uploaded successfully: ${relativePath}`);
      return relativePath;
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Specific method for uploading product images
  async uploadProductImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type for images only
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    return this.uploadFile(file, 'products');
  }

  // Specific method for uploading category images
  async uploadCategoryImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type for images only
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    return this.uploadFile(file, 'categories');
  }

  // Specific method for uploading vendor/store images
  async uploadVendorImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type for images only
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    return this.uploadFile(file, 'vendors');
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
      const fullPath = path.join(uploadPath, filePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`File deleted successfully: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/uploads/${filePath}`;
  }

  async validateImageFile(file: Express.Multer.File): Promise<boolean> {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedImageTypes.includes(file.mimetype);
  }

  async validateDocumentFile(file: Express.Multer.File): Promise<boolean> {
    const allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedDocumentTypes.includes(file.mimetype);
  }

  // Specific method for uploading article images
  async uploadArticleImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type for images only
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (10MB max for article images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 10MB.');
    }

    return this.uploadFile(file, 'article-images');
  }

  // Specific method for uploading article videos
  async uploadArticleVideo(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type for videos only
    const allowedMimeTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only MP4, AVI, MOV, WMV, FLV, and WebM videos are allowed.');
    }

    // Validate file size (50MB max for article videos)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 50MB.');
    }

    return this.uploadFile(file, 'article-videos');
  }

  async validateVideoFile(file: Express.Multer.File): Promise<boolean> {
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    return allowedVideoTypes.includes(file.mimetype);
  }
}
