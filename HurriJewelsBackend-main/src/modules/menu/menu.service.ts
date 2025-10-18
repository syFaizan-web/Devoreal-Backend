import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { QueryMenuItemDto } from './dto/query-menu-item.dto';
import { MenuItemResponseDto, MenuItemTreeResponseDto } from './dto/menu-item-response.dto';
import { Role } from './types/role.enum';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { AssetsService } from '../../common/services/assets.service';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
    private readonly assetsService: AssetsService,
  ) {}



  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      // Validate required fields
      if (!createMenuItemDto.name || createMenuItemDto.name.trim() === '') {
        throw new BadRequestException('Menu item name is required');
      }
      if (!createMenuItemDto.slug || createMenuItemDto.slug.trim() === '') {
        throw new BadRequestException('Menu item slug is required');
      }

      // Debug logging
      this.logger.debug('Creating menu item with data:', {
        name: createMenuItemDto.name,
        slug: createMenuItemDto.slug,
        parentId: createMenuItemDto.parentId,
        parentIdType: typeof createMenuItemDto.parentId,
        parentIdIsNull: createMenuItemDto.parentId === null,
        parentIdIsEmpty: createMenuItemDto.parentId === '',
      });

      // Check if slug already exists
      const existingSlug = await this.prisma.menuItem.findUnique({
        where: { slug: createMenuItemDto.slug },
      });

      if (existingSlug) {
        throw new ConflictException('Slug already exists');
      }

      // Calculate level if parentId is provided
      let level = 0;
      if (createMenuItemDto.parentId && createMenuItemDto.parentId !== null && createMenuItemDto.parentId !== '') {
        // Check if parent exists and is not soft-deleted
        const parent = await this.prisma.menuItem.findFirst({
          where: { 
            id: createMenuItemDto.parentId,
            isDeleted: false 
          },
        });

        if (!parent) {
          // Provide more helpful error message
          throw new NotFoundException(
            `Parent menu item with ID '${createMenuItemDto.parentId}' not found or has been deleted. ` +
            `Please create the parent menu item first or use a valid parent ID.`
          );
        }

        level = parent.level + 1;
      }

      // Validate linkage to domain objects
      let categoryRelation: any = undefined;
      let collectionRelation: any = undefined;
      let signatureRelation: any = undefined;
      
      if (createMenuItemDto.targetType === 'category') {
        if (!createMenuItemDto.categoryId) {
          throw new BadRequestException('categoryId is required when targetType is category');
        }
        const category = await this.prisma.category.findUnique({ where: { id: createMenuItemDto.categoryId } });
        if (!category) throw new NotFoundException('Linked category not found');
        categoryRelation = {
          connect: { id: createMenuItemDto.categoryId }
        };
      } else if (createMenuItemDto.targetType === 'collection' || createMenuItemDto.targetType === 'collections' || createMenuItemDto.targetType === 'Collection') {
        // Handle both collectionId and categoryId for backward compatibility
        const targetId = createMenuItemDto.collectionId || createMenuItemDto.categoryId;
        if (!targetId) {
          throw new BadRequestException('collectionId or categoryId is required when targetType is collection');
        }
        const collection = await this.prisma.collection.findUnique({ where: { id: targetId } });
        if (!collection) throw new NotFoundException('Linked collection not found');
        collectionRelation = {
          connect: { id: targetId }
        };
      } else if (createMenuItemDto.targetType === 'signature' || createMenuItemDto.targetType === 'signature-pieces' || createMenuItemDto.targetType === 'Signature Pieces') {
        // Handle both signaturePieceId and categoryId for backward compatibility
        const targetId = createMenuItemDto.signaturePieceId || createMenuItemDto.categoryId;
        if (!targetId) {
          throw new BadRequestException('signaturePieceId or categoryId is required when targetType is signature');
        }
        const signaturePiece = await this.prisma.signaturePiece.findUnique({ where: { id: targetId } });
        if (!signaturePiece) throw new NotFoundException('Linked signature piece not found');
        signatureRelation = {
          connect: { id: targetId }
        };
      }

      // Prepare data for creation - use parent relation instead of parentId
      const menuItemData: any = {
        name: createMenuItemDto.name,
        slug: createMenuItemDto.slug,
        description: createMenuItemDto.description,
        type: createMenuItemDto.type,
        targetType: createMenuItemDto.targetType,
        level: level,
        country: createMenuItemDto.country || [],
        language: createMenuItemDto.language || [],
        tags: createMenuItemDto.tags || [],
        isActive: createMenuItemDto.isActive ?? true,
        order: createMenuItemDto.order || 0,
        icon: createMenuItemDto.icon || '',
        image: createMenuItemDto.image || '',
        // Use parent relation instead of parentId
        parent: (createMenuItemDto.parentId && createMenuItemDto.parentId !== null && createMenuItemDto.parentId !== '') ? {
          connect: { id: createMenuItemDto.parentId }
        } : undefined,
        // Use relations instead of raw IDs
        category: categoryRelation,
        collection: collectionRelation,
        signaturePiece: signatureRelation,
      };

      // Create menu item
      const menuItem = await this.prisma.menuItem.create({
        data: menuItemData,
        include: {
          parent: true,
          children: true,
          category: true,
          collection: true,
          signaturePiece: true,
        },
      });

      return this.mapToResponseDto(menuItem);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Menu item with this slug already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid parent or category reference');
      }
      throw new InternalServerErrorException('Failed to create menu item: ' + error.message);
    }
  }

  async findAll(query: QueryMenuItemDto): Promise<MenuItemResponseDto[]> {
    try {
      this.logger.debug('MenuService.findAll - Query received:', query);
      
      const where: any = {
        isDeleted: false, // Always filter out soft-deleted items by default
      };

      // Handle isActive filter - convert string to boolean
      if (query.isActive !== undefined && query.isActive !== '') {
        const isActiveValue = query.isActive === 'true';
        where.isActive = isActiveValue;
        this.logger.debug('Added isActive filter:', isActiveValue, '(converted from:', query.isActive, ')');
      }

      if (query.parentId !== undefined && query.parentId !== '') {
        where.parentId = query.parentId;
        this.logger.debug('Added parentId filter:', query.parentId);
      }

      if (query.type && query.type !== '') {
        where.type = query.type;
        this.logger.debug('Added type filter:', query.type);
      }

      if (query.country && query.country !== '') {
        where.country = { has: query.country };
        this.logger.debug('Added country filter:', query.country);
      }

      if (query.language && query.language !== '') {
        where.language = { has: query.language };
        this.logger.debug('Added language filter:', query.language);
      }

      this.logger.debug('Final where clause:', JSON.stringify(where, null, 2));

      const menuItems = await this.prisma.menuItem.findMany({
        where,
        include: {
          parent: true,
          children: true,
          category: true,
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
      });

      this.logger.debug('Found menu items:', menuItems.length);
      this.logger.debug('Menu items data:', menuItems.map(item => ({ id: item.id, name: item.name, isActive: item.isActive, isDeleted: item.isDeleted })));

      return menuItems.map(item => this.mapToResponseDto(item));
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch menu items: ' + error.message);
    }
  }

  async findOne(id: string): Promise<MenuItemResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      const menuItem = await this.prisma.menuItem.findFirst({
        where: { 
          id,
          isDeleted: false, // Filter out soft-deleted items
        } as any,
        include: {
          parent: true,
          children: true,
          category: true,
        },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      return this.mapToResponseDto(menuItem);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch menu item: ' + error.message);
    }
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto, updatedBy?: string): Promise<MenuItemResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      // Check if menu item exists and is not soft-deleted
      const existingMenuItem = await this.prisma.menuItem.findFirst({
        where: { 
          id,
          isDeleted: false,
        } as any,
      });

      if (!existingMenuItem) {
        throw new NotFoundException('Menu item not found');
      }

      // Check if slug already exists (if being updated)
      if (updateMenuItemDto.slug && updateMenuItemDto.slug !== existingMenuItem.slug) {
        const existingSlug = await this.prisma.menuItem.findFirst({
          where: { 
            slug: updateMenuItemDto.slug,
            isDeleted: false,
          } as any,
        });

        if (existingSlug) {
          throw new ConflictException('Slug already exists');
        }
      }

      // Calculate level if parentId is being updated
      let level = existingMenuItem.level;
      if (updateMenuItemDto.parentId !== undefined) {
        if (updateMenuItemDto.parentId === id) {
          throw new BadRequestException('Menu item cannot be its own parent');
        }

        if (updateMenuItemDto.parentId) {
          const parent = await this.prisma.menuItem.findFirst({
            where: { 
              id: updateMenuItemDto.parentId,
              isDeleted: false,
            } as any,
          });

          if (!parent) {
            throw new NotFoundException('Parent menu item not found');
          }

          level = parent.level + 1;
        } else {
          // If removing parent, set level to 0
          level = 0;
        }
      }

      // Validate category linkage on update
      const updateData: any = {
        ...updateMenuItemDto,
        level: level,
        updatedBy,
      };

      if (updateMenuItemDto.targetType !== undefined) {
        updateData.targetType = updateMenuItemDto.targetType;
      }

      if (updateMenuItemDto.targetType === 'category') {
        const newCategoryId = updateMenuItemDto.categoryId ?? (existingMenuItem as any)['categoryId'];
        if (!newCategoryId) {
          throw new BadRequestException('categoryId is required when targetType is category');
        }
        const category = await this.prisma.category.findUnique({ where: { id: newCategoryId } });
        if (!category) throw new NotFoundException('Linked category not found');
        updateData.category = {
          connect: { id: newCategoryId }
        };
        // disconnect others
        updateData.collection = { disconnect: true };
        updateData.signaturePiece = { disconnect: true };
      } else if (updateMenuItemDto.targetType === 'collection' || updateMenuItemDto.targetType === 'collections') {
        const newCollectionId = updateMenuItemDto.collectionId ?? (existingMenuItem as any)['collectionId'];
        if (!newCollectionId) {
          throw new BadRequestException('collectionId is required when targetType is collection');
        }
        const collection = await this.prisma.collection.findUnique({ where: { id: newCollectionId } });
        if (!collection) throw new NotFoundException('Linked collection not found');
        updateData.collection = {
          connect: { id: newCollectionId }
        };
        updateData.category = { disconnect: true };
        updateData.signaturePiece = { disconnect: true };
      } else if (updateMenuItemDto.targetType === 'signature' || updateMenuItemDto.targetType === 'signature-pieces') {
        const newSignatureId = updateMenuItemDto.signaturePieceId ?? (existingMenuItem as any)['signaturePieceId'];
        if (!newSignatureId) {
          throw new BadRequestException('signaturePieceId is required when targetType is signature');
        }
        const signature = await this.prisma.signaturePiece.findUnique({ where: { id: newSignatureId } });
        if (!signature) throw new NotFoundException('Linked signature piece not found');
        updateData.signaturePiece = {
          connect: { id: newSignatureId }
        };
        updateData.category = { disconnect: true };
        updateData.collection = { disconnect: true };
      } else if (updateMenuItemDto.targetType && !['category','collection','collections','signature','signature-pieces'].includes(updateMenuItemDto.targetType)) {
        // For other target types, disconnect all domain links
        updateData.category = { disconnect: true };
        updateData.collection = { disconnect: true };
        updateData.signaturePiece = { disconnect: true };
      }

      // Handle parent relation
      if (updateMenuItemDto.parentId !== undefined) {
        if (updateMenuItemDto.parentId) {
          updateData.parent = {
            connect: { id: updateMenuItemDto.parentId }
          };
        } else {
          updateData.parent = {
            disconnect: true
          };
        }
      }

      // Handle parent-child visibility cascade
      if (updateData.isActive !== undefined && updateData.isActive !== existingMenuItem.isActive) {
        await this.cascadeVisibilityToChildren(id, updateData.isActive);
      }

      // Update menu item
      const updatedMenuItem = await this.prisma.menuItem.update({
        where: { id },
        data: updateData,
        include: {
          parent: true,
          children: true,
          category: true,
        },
      });

      return this.mapToResponseDto(updatedMenuItem);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Menu item with this slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Menu item not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid parent or category reference');
      }
      throw new InternalServerErrorException('Failed to update menu item: ' + error.message);
    }
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      const menuItem = await this.prisma.menuItem.findFirst({
        where: { 
          id,
          isDeleted: false,
        } as any,
        include: { children: true },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      // Soft delete the menu item and all its children
      await this.softDeleteWithChildren(id, deletedBy);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Menu item not found');
      }
      throw new InternalServerErrorException('Failed to delete menu item: ' + error.message);
    }
  }

  async hardDelete(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      const menuItem = await this.prisma.menuItem.findFirst({
        where: { 
          id,
          isDeleted: false,
        } as any,
        include: { children: true },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      if (menuItem.children.length > 0) {
        throw new BadRequestException('Cannot hard delete menu item with children. Delete children first.');
      }

      // Convert to soft delete for consistency
      await this.prisma.menuItem.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: undefined,
          deletedAt: new Date(),
        } as any,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Menu item not found');
      }
      throw new InternalServerErrorException('Failed to hard delete menu item: ' + error.message);
    }
  }

  async findChildren(id: string): Promise<MenuItemResponseDto[]> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      const children = await this.prisma.menuItem.findMany({
        where: { parentId: id, isDeleted: false },
        include: {
          parent: true,
          children: true,
          category: true,
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
      });

      return children.map(item => this.mapToResponseDto(item));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch menu item children: ' + error.message);
    }
  }

  async findTree(id: string): Promise<MenuItemTreeResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }

      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id },
        include: {
          parent: true,
          category: true,
          children: {
            include: {
              category: true,
              children: {
                include: {
                  category: true,
                  children: true,
                },
              },
            },
          },
        },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      return this.mapToTreeResponseDto(menuItem);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Menu item not found');
      }
      throw new InternalServerErrorException('Failed to fetch menu item tree: ' + error.message);
    }
  }

  // Public actions for controllers
  async softDelete(id: string, userId?: string): Promise<void> {
    await this.softDeleteWithChildren(id, userId);
  }

  async restore(id: string, userId?: string): Promise<void> {
    // Ensure the item exists (even if soft-deleted)
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');

    // Restore all children (include soft-deleted ones), then parent
    const children = await this.getAllChildrenRecursively(id, true);
    for (const child of children) {
      await this.prisma.menuItem.update({
        where: { id: child.id },
        data: {
          isDeleted: false,
          deletedBy: null,
          deletedAt: null,
          updatedBy: userId,
        } as any,
      });
    }

    await this.prisma.menuItem.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
        updatedBy: userId,
      } as any,
    });
  }

  async toggleStatus(id: string, userId?: string): Promise<void> {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    const newStatus = !item.isActive;
    await this.prisma.menuItem.update({
      where: { id },
      data: { isActive: newStatus, updatedBy: userId } as any,
    });
    await this.cascadeVisibilityToChildren(id, newStatus);
  }

  // Helper method to soft delete a menu item and all its children
  private async softDeleteWithChildren(id: string, deletedBy?: string): Promise<void> {
    // Get all children recursively
    const children = await this.getAllChildrenRecursively(id);
    
    // Soft delete all children first
    for (const child of children) {
      await this.prisma.menuItem.update({
        where: { id: child.id },
        data: {
          isDeleted: true,
          deletedBy,
          deletedAt: new Date(),
        } as any,
      });
    }
    
    // Soft delete the parent
    await this.prisma.menuItem.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy,
        deletedAt: new Date(),
      } as any,
    });
  }

  // Helper method to get all children recursively
  private async getAllChildrenRecursively(parentId: string, includeDeleted: boolean = false): Promise<any[]> {
    const directChildren = await this.prisma.menuItem.findMany({
      where: includeDeleted ? { parentId } as any : { parentId, isDeleted: false } as any,
    });

    let allChildren = [...directChildren];

    for (const child of directChildren) {
      const grandChildren = await this.getAllChildrenRecursively(child.id);
      allChildren = [...allChildren, ...grandChildren];
    }

    return allChildren;
  }

  // Helper method to cascade visibility to children
  private async cascadeVisibilityToChildren(parentId: string, isActive: boolean): Promise<void> {
    const children = await this.prisma.menuItem.findMany({
      where: { 
        parentId,
        isDeleted: false,
      } as any,
    });

    for (const child of children) {
      await this.prisma.menuItem.update({
        where: { id: child.id },
        data: {
          isActive,
        } as any,
      });

      // Recursively cascade to grandchildren
      await this.cascadeVisibilityToChildren(child.id, isActive);
    }
  }

  private mapToResponseDto(menuItem: any): MenuItemResponseDto {
    // Determine the linked ID based on targetType
    let linkedId: string | null = null;
    if (menuItem.targetType === 'category') {
      linkedId = menuItem.category?.id || menuItem.categoryId;
    } else if (menuItem.targetType === 'collection' || menuItem.targetType === 'collections' || menuItem.targetType === 'Collection') {
      linkedId = menuItem.collection?.id || menuItem.collectionId;
    } else if (menuItem.targetType === 'signature' || menuItem.targetType === 'signature-pieces' || menuItem.targetType === 'Signature Pieces') {
      linkedId = menuItem.signaturePiece?.id || menuItem.signaturePieceId;
    }

    return {
      id: menuItem.id,
      name: menuItem.name,
      slug: menuItem.slug,
      description: menuItem.description,
      type: menuItem.type,
      targetType: menuItem.targetType,
      categoryId: linkedId, // Always show the linked ID in categoryId field
      collectionId: menuItem.collection?.id || menuItem.collectionId,
      signaturePieceId: menuItem.signaturePiece?.id || menuItem.signaturePieceId,
      parentId: menuItem.parentId,
      level: menuItem.level,
      country: menuItem.country,
      language: menuItem.language,
      tags: menuItem.tags,
      isActive: menuItem.isActive,
      order: menuItem.order,
      icon: menuItem.icon,
      image: menuItem.image,
      imageUrl: this.assetsService.buildUrl(menuItem.image),
      isDeleted: menuItem.isDeleted,
      deletedBy: menuItem.deletedBy,
      deletedDateTime: menuItem.deletedAt,
      updatedBy: menuItem.updatedBy,
      updatedDateTime: menuItem.updatedAt,
      createdAt: menuItem.createdAt,
      updatedAt: menuItem.updatedAt,
    };
  }

  private mapToTreeResponseDto(menuItem: any): MenuItemTreeResponseDto {
    const baseResponse = this.mapToResponseDto(menuItem);
    
    return {
      ...baseResponse,
      children: menuItem.children.map((child: any) => this.mapToTreeResponseDto(child)),
    };
  }
}
