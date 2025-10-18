import { Test, TestingModule } from '@nestjs/testing';
import { EngagementService } from '../engagement.service';
import { PrismaService } from '../../common/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';

describe('EngagementService', () => {
  let service: EngagementService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    article: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    viewEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookmark: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    newsletterSignup: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    articleCategory: {
      findMany: jest.fn(),
    },
    articleTag: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EngagementService>(EngagementService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackView', () => {
    const viewEventDto = {
      entityType: EntityType.ARTICLE,
      entityId: 'article1',
    };

    const mockArticle = {
      id: 'article1',
      isActive: true,
      isDeleted: false,
    };

    it('should track view successfully', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.viewEvent.findFirst.mockResolvedValue(null);
      mockPrismaService.viewEvent.create.mockResolvedValue({});
      mockPrismaService.article.update.mockResolvedValue({});

      await service.trackView(viewEventDto, 'ip-hash', 'user1');

      expect(mockPrismaService.viewEvent.create).toHaveBeenCalledWith({
        data: {
          entityType: EntityType.ARTICLE,
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

    it('should throw NotFoundException if article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.trackView(viewEventDto, 'ip-hash', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not create duplicate view within 30 minutes', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.viewEvent.findFirst.mockResolvedValue({ id: 'existing-view' });

      await service.trackView(viewEventDto, 'ip-hash', 'user1');

      expect(mockPrismaService.viewEvent.create).not.toHaveBeenCalled();
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleLike', () => {
    const likeDto = {
      entityType: EntityType.ARTICLE,
      entityId: 'article1',
    };

    const mockArticle = {
      id: 'article1',
      isActive: true,
      isDeleted: false,
    };

    it('should like article successfully', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.like.findUnique.mockResolvedValue(null);
      mockPrismaService.like.create.mockResolvedValue({});
      mockPrismaService.article.update.mockResolvedValue({});

      const result = await service.toggleLike(likeDto, 'user1');

      expect(mockPrismaService.like.create).toHaveBeenCalledWith({
        data: {
          entityType: EntityType.ARTICLE,
          entityId: 'article1',
          userId: 'user1',
          createdBy: 'user1',
        },
      });
      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: {
          likesCount: { increment: 1 },
        },
      });
      expect(result).toEqual({ liked: true, likesCount: 0 });
    });

    it('should unlike article successfully', async () => {
      const existingLike = {
        id: 'like1',
        userId: 'user1',
        entityType: EntityType.ARTICLE,
        entityId: 'article1',
      };

      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.like.findUnique.mockResolvedValue(existingLike);
      mockPrismaService.like.update.mockResolvedValue({});
      mockPrismaService.article.update.mockResolvedValue({});

      const result = await service.toggleLike(likeDto, 'user1');

      expect(mockPrismaService.like.update).toHaveBeenCalledWith({
        where: { id: 'like1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'user1',
        },
      });
      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article1' },
        data: {
          likesCount: { decrement: 1 },
        },
      });
      expect(result).toEqual({ liked: false, likesCount: 0 });
    });
  });

  describe('toggleBookmark', () => {
    const bookmarkDto = {
      entityType: EntityType.ARTICLE,
      entityId: 'article1',
    };

    const mockArticle = {
      id: 'article1',
      isActive: true,
      isDeleted: false,
    };

    it('should bookmark article successfully', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.bookmark.findUnique.mockResolvedValue(null);
      mockPrismaService.bookmark.create.mockResolvedValue({});

      const result = await service.toggleBookmark(bookmarkDto, 'user1');

      expect(mockPrismaService.bookmark.create).toHaveBeenCalledWith({
        data: {
          entityType: EntityType.ARTICLE,
          entityId: 'article1',
          userId: 'user1',
          createdBy: 'user1',
        },
      });
      expect(result).toEqual({ bookmarked: true });
    });

    it('should remove bookmark successfully', async () => {
      const existingBookmark = {
        id: 'bookmark1',
        userId: 'user1',
        entityType: EntityType.ARTICLE,
        entityId: 'article1',
      };

      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.bookmark.findUnique.mockResolvedValue(existingBookmark);
      mockPrismaService.bookmark.update.mockResolvedValue({});

      const result = await service.toggleBookmark(bookmarkDto, 'user1');

      expect(mockPrismaService.bookmark.update).toHaveBeenCalledWith({
        where: { id: 'bookmark1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'user1',
        },
      });
      expect(result).toEqual({ bookmarked: false });
    });
  });

  describe('subscribeToNewsletter', () => {
    const subscribeDto = {
      email: 'test@example.com',
      source: 'blog-footer',
    };

    it('should create new newsletter subscription', async () => {
      mockPrismaService.newsletterSignup.findUnique.mockResolvedValue(null);
      mockPrismaService.newsletterSignup.create.mockResolvedValue({});

      await service.subscribeToNewsletter(subscribeDto);

      expect(mockPrismaService.newsletterSignup.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          source: 'blog-footer',
        },
      });
    });

    it('should reactivate deleted subscription', async () => {
      const existingSubscription = {
        id: 'sub1',
        email: 'test@example.com',
        isDeleted: true,
      };

      mockPrismaService.newsletterSignup.findUnique.mockResolvedValue(existingSubscription);
      mockPrismaService.newsletterSignup.update.mockResolvedValue({});

      await service.subscribeToNewsletter(subscribeDto);

      expect(mockPrismaService.newsletterSignup.update).toHaveBeenCalledWith({
        where: { id: 'sub1' },
        data: {
          isDeleted: false,
          source: 'blog-footer',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should not create duplicate active subscription', async () => {
      const existingSubscription = {
        id: 'sub1',
        email: 'test@example.com',
        isDeleted: false,
      };

      mockPrismaService.newsletterSignup.findUnique.mockResolvedValue(existingSubscription);

      await service.subscribeToNewsletter(subscribeDto);

      expect(mockPrismaService.newsletterSignup.create).not.toHaveBeenCalled();
      expect(mockPrismaService.newsletterSignup.update).not.toHaveBeenCalled();
    });
  });

  describe('getTrendingTopics', () => {
    it('should return trending categories and tags', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Technology',
          slug: 'technology',
          _count: { articles: 5 },
        },
      ];

      const mockTags = [
        {
          id: 'tag1',
          name: 'JavaScript',
          slug: 'javascript',
          _count: { articles: 3 },
        },
      ];

      mockPrismaService.articleCategory.findMany.mockResolvedValue(mockCategories);
      mockPrismaService.articleTag.findMany.mockResolvedValue(mockTags);

      const result = await service.getTrendingTopics(14, 10);

      expect(result).toEqual({
        categories: [
          {
            id: 'cat1',
            name: 'Technology',
            slug: 'technology',
            count: 5,
          },
        ],
        tags: [
          {
            id: 'tag1',
            name: 'JavaScript',
            slug: 'javascript',
            count: 3,
          },
        ],
      });
    });
  });

  describe('generateIpHash', () => {
    it('should generate consistent hash for same IP', () => {
      const ip = '192.168.1.1';
      const hash1 = service.generateIpHash(ip);
      const hash2 = service.generateIpHash(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different IPs', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      const hash1 = service.generateIpHash(ip1);
      const hash2 = service.generateIpHash(ip2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

