import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from '../articles.service';
import { PrismaService } from '../../common/database/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    article: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    author: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    articleOnCategories: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    articleOnTags: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    viewEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createArticleDto = {
      title: 'Test Article',
      excerpt: 'Test excerpt',
      content: 'Test content',
      readMinutes: 5,
      categoryIds: ['cat1'],
      tagIds: ['tag1'],
      images: ['uploads/article-images/image1.jpg', 'uploads/article-images/image2.jpg'],
      videos: ['uploads/article-videos/video1.mp4'],
    };

    const mockUser = {
      id: 'user1',
      fullName: 'Test User',
      avatar: 'avatar.jpg',
    };

    const mockAuthor = {
      id: 'author1',
      userId: 'user1',
      displayName: 'Test User',
    };

    const mockArticle = {
      id: 'article1',
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'Test excerpt',
      content: 'Test content',
      readMinutes: 5,
      authorId: 'author1',
      status: ArticleStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: mockAuthor,
      categories: [],
      tags: [],
    };

    it('should create an article successfully', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);
      mockPrismaService.author.findFirst.mockResolvedValue(mockAuthor);
      mockPrismaService.article.create.mockResolvedValue(mockArticle);
      mockPrismaService.articleOnCategories.createMany.mockResolvedValue({});
      mockPrismaService.articleOnTags.createMany.mockResolvedValue({});

      const result = await service.create(createArticleDto, 'user1');

      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-article' },
      });
      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Article',
          slug: 'test-article',
          authorId: 'author1',
          createdBy: 'user1',
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if slug already exists', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createArticleDto, 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create author if not exists', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);
      mockPrismaService.author.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.author.create.mockResolvedValue(mockAuthor);
      mockPrismaService.article.create.mockResolvedValue(mockArticle);
      mockPrismaService.articleOnCategories.createMany.mockResolvedValue({});
      mockPrismaService.articleOnTags.createMany.mockResolvedValue({});

      await service.create(createArticleDto, 'user1');

      expect(mockPrismaService.author.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          displayName: 'Test User',
          avatarUrl: 'avatar.jpg',
        }),
      });
    });

    it('should create article with images and videos', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);
      mockPrismaService.author.findFirst.mockResolvedValue(mockAuthor);
      mockPrismaService.article.create.mockResolvedValue({
        ...mockArticle,
        images: ['uploads/article-images/image1.jpg', 'uploads/article-images/image2.jpg'],
        videos: ['uploads/article-videos/video1.mp4'],
      });
      mockPrismaService.articleOnCategories.createMany.mockResolvedValue({});
      mockPrismaService.articleOnTags.createMany.mockResolvedValue({});

      const result = await service.create(createArticleDto, 'user1');

      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Article',
          slug: 'test-article',
          images: ['uploads/article-images/image1.jpg', 'uploads/article-images/image2.jpg'],
          videos: ['uploads/article-videos/video1.mp4'],
          authorId: 'author1',
          createdBy: 'user1',
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    const mockArticles = [
      {
        id: 'article1',
        title: 'Test Article 1',
        slug: 'test-article-1',
        excerpt: 'Test excerpt 1',
        content: 'Test content 1',
        readMinutes: 5,
        authorId: 'author1',
        status: ArticleStatus.PUBLISHED,
        viewsCount: 100,
        likesCount: 10,
        isFeatured: false,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: 'author1', displayName: 'Test Author' },
        categories: [],
        tags: [],
      },
    ];

    it('should return paginated articles', async () => {
      const query = { page: 1, limit: 10 };
      mockPrismaService.article.findMany.mockResolvedValue(mockArticles);
      mockPrismaService.article.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should filter by search query', async () => {
      const query = { q: 'test', page: 1, limit: 10 };
      mockPrismaService.article.findMany.mockResolvedValue(mockArticles);
      mockPrismaService.article.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: 'test', mode: 'insensitive' } },
            { excerpt: { contains: 'test', mode: 'insensitive' } },
            { content: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
        orderBy: { publishedAt: 'desc' },
        skip: 0,
        take: 10,
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    const mockArticle = {
      id: 'article1',
      slug: 'test-article',
      title: 'Test Article',
      excerpt: 'Test excerpt',
      content: 'Test content',
      readMinutes: 5,
      viewsCount: 100,
      likesCount: 10,
      isActive: true,
      isDeleted: false,
      author: { id: 'author1', displayName: 'Test Author' },
      categories: [],
      tags: [],
    };

    it('should return article by slug', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.findOne('test-article');

      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-article' },
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if article is deleted', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        isDeleted: true,
      });

      await expect(service.findOne('test-article')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const mockArticle = {
      id: 'article1',
      title: 'Test Article',
      slug: 'test-article',
      images: ['uploads/article-images/old-image1.jpg'],
      videos: ['uploads/article-videos/old-video1.mp4'],
      author: { userId: 'user1' },
    };

    const updateDto = {
      title: 'Updated Article',
      excerpt: 'Updated excerpt',
    };

    it('should update article successfully', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.findUnique.mockResolvedValueOnce(null); // For slug check
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        ...updateDto,
      });

      const result = await service.update('article1', updateDto, 'user1', 'ADMIN');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: expect.objectContaining({
          ...updateDto,
          slug: 'updated-article',
          updatedBy: 'user1',
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user cannot edit', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      await expect(service.update('article1', updateDto, 'user2', 'USER')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update article with new images and videos', async () => {
      const updateDtoWithFiles = {
        title: 'Updated Article',
        images: ['uploads/article-images/new-image1.jpg'],
        videos: ['uploads/article-videos/new-video1.mp4'],
      };

      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.findUnique.mockResolvedValueOnce(null); // For slug check
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        ...updateDtoWithFiles,
        images: ['uploads/article-images/old-image1.jpg', 'uploads/article-images/new-image1.jpg'],
        videos: ['uploads/article-videos/old-video1.mp4', 'uploads/article-videos/new-video1.mp4'],
      });

      const result = await service.update('article1', updateDtoWithFiles, 'user1', 'ADMIN');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: expect.objectContaining({
          title: 'Updated Article',
          images: ['uploads/article-images/old-image1.jpg', 'uploads/article-images/new-image1.jpg'],
          videos: ['uploads/article-videos/old-video1.mp4', 'uploads/article-videos/new-video1.mp4'],
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should remove images and videos when specified', async () => {
      const updateDtoWithRemoval = {
        title: 'Updated Article',
        removeImages: ['uploads/article-images/old-image1.jpg'],
        removeVideos: ['uploads/article-videos/old-video1.mp4'],
      };

      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.findUnique.mockResolvedValueOnce(null); // For slug check
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        ...updateDtoWithRemoval,
        images: [],
        videos: [],
      });

      const result = await service.update('article1', updateDtoWithRemoval, 'user1', 'ADMIN');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: expect.objectContaining({
          title: 'Updated Article',
          images: [],
          videos: [],
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    const mockArticle = {
      id: 'article1',
      title: 'Test Article',
      isActive: true,
      isDeleted: false,
      author: { userId: 'user1' },
    };

    it('should soft delete article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue({});

      await service.remove('article1', 'user1', 'ADMIN');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'user1',
        },
      });
    });
  });

  describe('incrementViews', () => {
    const mockArticle = {
      id: 'article1',
      slug: 'test-article',
      isActive: true,
      isDeleted: false,
    };

    it('should increment views if no recent view exists', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.viewEvent.findFirst.mockResolvedValue(null);
      mockPrismaService.viewEvent.create.mockResolvedValue({});
      mockPrismaService.article.update.mockResolvedValue({});

      await service.incrementViews('test-article', 'ip-hash', 'user1');

      expect(mockPrismaService.viewEvent.create).toHaveBeenCalledWith({
        data: {
          entityType: 'ARTICLE',
          entityId: 'article1',
          ipHash: 'ip-hash',
          userId: 'user1',
        },
      });
      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: {
          viewsCount: { increment: 1 },
        },
      });
    });

    it('should not increment views if recent view exists', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.viewEvent.findFirst.mockResolvedValue({ id: 'view1' });

      await service.incrementViews('test-article', 'ip-hash', 'user1');

      expect(mockPrismaService.viewEvent.create).not.toHaveBeenCalled();
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });
  });
});

