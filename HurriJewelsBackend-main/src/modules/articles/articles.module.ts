import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { ArticleCategoriesController } from './article-categories.controller';
import { ArticleTagsController } from './article-tags.controller';
import { AuthorsController } from './authors.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';

@Module({
  imports: [DatabaseModule, FileUploadModule],
  controllers: [
    ArticlesController,
    ArticleCategoriesController,
    ArticleTagsController,
    AuthorsController,
  ],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}

