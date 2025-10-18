import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    // Ensure main uploads directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
    
    // Ensure menu-items subdirectory exists
    const menuItemsPath = join(this.uploadPath, 'menu-items');
    if (!existsSync(menuItemsPath)) {
      mkdirSync(menuItemsPath, { recursive: true });
    }
  }

  async uploadMenuImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    // Generate unique filename
    const fileExtension = extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = join(this.uploadPath, 'menu-items', fileName);

    try {
      // Save file
      writeFileSync(filePath, file.buffer);
      
      // Return relative path for database storage
      return `uploads/menu-items/${fileName}`;
    } catch (error) {
      throw new BadRequestException('Failed to save file');
    }
  }

  async deleteMenuImage(imagePath: string): Promise<void> {
    if (!imagePath) return;

    try {
      const fullPath = join(process.cwd(), imagePath);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    } catch (error) {
      this.logger.error('Failed to delete image', error.stack, { imagePath });
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return null;
    
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:5000');
    // Ensure imagePath doesn't start with a slash to avoid double slashes
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${baseUrl}/${cleanPath}`;
  }
}
