import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSignaturePieceDto } from './dto/create-signature-piece.dto';
import { UpdateSignaturePieceDto } from './dto/update-signature-piece.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { FileUploadService } from '../../common/file-upload/file-upload.service';

@Injectable()
export class SignaturePiecesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findAll(query: any) {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Build where clause
      const where: any = {
        isDeleted: false,
      };

      if (isActive !== undefined) {
        where.isActive = isActive === 'true' || isActive === true;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (sortBy === 'title') {
        orderBy.title = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
        orderBy.updatedAt = sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      const skip = (pageNum - 1) * limitNum;

      const [signaturePieces, total] = await this.prisma.$transaction([
        this.prisma.signaturePiece.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        this.prisma.signaturePiece.count({ where }),
      ]);

      // Add imageUrl to each signature piece
      const signaturePiecesWithImageUrl = signaturePieces.map(signaturePiece => ({
        ...signaturePiece,
        imageUrl: signaturePiece.image ? this.fileUploadService.getFileUrl(signaturePiece.image) : null,
      }));

      return {
        data: signaturePiecesWithImageUrl,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch signature pieces: ' + error.message);
    }
  }

  async create(dto: CreateSignaturePieceDto, userId?: string) {
    try {
      const exists = await this.prisma.signaturePiece.findUnique({ where: { slug: dto.slug } });
      if (exists) throw new ConflictException('slug already exists');
      return await this.prisma.signaturePiece.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          description: dto.description,
          image: dto.image,
          isActive: dto.isActive ?? true,
          isDeleted: false,
          createdBy: userId,
          updatedBy: userId,
          updatedAt: new Date(),
        } as any,
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('slug already exists');
      throw new InternalServerErrorException('Failed to create signature piece: ' + error.message);
    }
  }

  async update(id: string, dto: UpdateSignaturePieceDto, userId?: string) {
    if (!id) throw new BadRequestException('id is required');
    const existing = await this.prisma.signaturePiece.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException('signature piece not found');
    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.signaturePiece.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('slug already exists');
    }
    try {
      return await this.prisma.signaturePiece.update({
        where: { id },
        data: { ...dto, updatedBy: userId, updatedAt: new Date() } as any,
      });
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException('signature piece not found');
      throw new InternalServerErrorException('Failed to update signature piece: ' + error.message);
    }
  }

  async softDelete(id: string, userId?: string) {
    if (!id) throw new BadRequestException('id is required');
    const existing = await this.prisma.signaturePiece.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException('signature piece not found');
    await this.prisma.signaturePiece.update({
      where: { id },
      data: { isDeleted: true, isActive: false, deletedBy: userId, deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() } as any,
    });
  }

  async hardDelete(id: string) {
    if (!id) throw new BadRequestException('id is required');
    try {
      await this.prisma.signaturePiece.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException('signature piece not found');
      throw new InternalServerErrorException('Failed to hard delete signature piece: ' + error.message);
    }
  }

  async listProductsBySlug(slug: string, filter: ProductFilterDto) {
    const sp = await this.prisma.signaturePiece.findFirst({ where: { slug, isDeleted: false, isActive: true } });
    if (!sp) throw new NotFoundException('signature piece not found');

    const where: any = { isDeleted: false, isActive: true };
    // For now, filter by tags/attributes containing slug
    where.OR = [
      { tags: { contains: slug } },
      { attributes: { contains: slug } },
    ];

    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.vendorId) where.vendorId = filter.vendorId;
    if (filter.inStock) where.stockQuantity = { gt: 0 };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.price = {};
      if (filter.minPrice !== undefined) where.price.gte = filter.minPrice;
      if (filter.maxPrice !== undefined) where.price.lte = filter.maxPrice;
    }

    const orderBy: any[] = [];
    switch (filter.sort) {
      case 'price_asc': orderBy.push({ price: 'asc' }); break;
      case 'price_desc': orderBy.push({ price: 'desc' }); break;
      case 'newest': orderBy.push({ createdAt: 'desc' }); break;
      case 'name_asc': orderBy.push({ name: 'asc' }); break;
      case 'name_desc': orderBy.push({ name: 'desc' }); break;
      default: orderBy.push({ createdAt: 'desc' });
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 12;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.product.count({ where }),
    ]);

    return { signaturePiece: sp, items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}


