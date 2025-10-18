import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssetsService {
  constructor(private readonly configService: ConfigService) {}

  buildUrl(relativeOrAbsolute?: string | null): string | null {
    if (!relativeOrAbsolute) return null;

    const value = String(relativeOrAbsolute).trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) return value;

    const cleanPath = value.replace(/^\/+/, '');
    const pathWithUploads = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;

    const base =
      process.env.ASSETS_BASE_URL ||
      this.configService.get<string>('ASSETS_BASE_URL') ||
      this.configService.get<string>('BASE_URL') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:5000';

    return `${base.replace(/\/+$/, '')}/${pathWithUploads}`;
  }
}



