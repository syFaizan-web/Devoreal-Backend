import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SubmitVerificationDto } from './dto/vendor-verification.dto';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { VendorListQueryDto, VendorDetailDto } from './dto/admin-vendor.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private prisma: PrismaService) {}

  // Vendor Verification Methods
  async submitVerification(userId: string, verificationData: SubmitVerificationDto) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      // Check if user has vendor profile
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId },
        include: { verification: true }
      });

      if (!vendorProfile) {
        throw new NotFoundException('Vendor profile not found. Please create a vendor profile first.');
      }

      // Check if verification already exists
      if (vendorProfile.verification) {
        if (vendorProfile.verification.status === 'PENDING') {
          throw new BadRequestException('Verification request is already pending review.');
        }
        if (vendorProfile.verification.status === 'APPROVED') {
          throw new BadRequestException('Vendor is already verified.');
        }
      }

      // Validate that at least one document is provided
      const hasDocuments = verificationData.businessLicense || 
                          verificationData.taxDocument || 
                          verificationData.identityDocument || 
                          verificationData.bankStatement ||
                          verificationData.additionalDocs;

      if (!hasDocuments) {
        throw new BadRequestException('At least one verification document must be provided.');
      }

      // Create or update verification
      const verification = await this.prisma.vendorVerification.upsert({
        where: { vendorId: vendorProfile.id },
        update: {
          status: 'PENDING',
          businessLicense: verificationData.businessLicense,
          taxDocument: verificationData.taxDocument,
          identityDocument: verificationData.identityDocument,
          bankStatement: verificationData.bankStatement,
          additionalDocs: verificationData.additionalDocs,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
        create: {
          vendorId: vendorProfile.id,
          status: 'PENDING',
          businessLicense: verificationData.businessLicense,
          taxDocument: verificationData.taxDocument,
          identityDocument: verificationData.identityDocument,
          bankStatement: verificationData.bankStatement,
          additionalDocs: verificationData.additionalDocs,
          submittedAt: new Date(),
        }
      });

      return {
        id: verification.id,
        status: verification.status,
        submittedAt: verification.submittedAt,
        message: 'Verification request submitted successfully. It will be reviewed by our team.'
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Verification request already exists');
      }
      throw new InternalServerErrorException('Failed to submit verification: ' + error.message);
    }
  }

  async getVerificationStatus(userId: string) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId },
        include: { verification: true }
      });

      if (!vendorProfile) {
        throw new NotFoundException('Vendor profile not found.');
      }

      if (!vendorProfile.verification) {
        return {
          status: 'NOT_SUBMITTED',
          message: 'No verification request has been submitted yet.'
        };
      }

      return {
        id: vendorProfile.verification.id,
        status: vendorProfile.verification.status,
        rejectionReason: vendorProfile.verification.rejectionReason,
        submittedAt: vendorProfile.verification.submittedAt,
        reviewedAt: vendorProfile.verification.reviewedAt,
        reviewedBy: vendorProfile.verification.reviewedBy
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get verification status: ' + error.message);
    }
  }

  // Store Management Methods
  async createStore(userId: string, storeData: CreateStoreDto) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }
      if (!storeData.name || storeData.name.trim() === '') {
        throw new BadRequestException('Store name is required');
      }
      if (!storeData.slug || storeData.slug.trim() === '') {
        throw new BadRequestException('Store slug is required');
      }

      // Check if user has vendor profile
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId },
        include: { verification: true }
      });

      if (!vendorProfile) {
        throw new NotFoundException('Vendor profile not found. Please create a vendor profile first.');
      }

      // Check if vendor is verified
      if (!vendorProfile.isVerified || !vendorProfile.verification || vendorProfile.verification.status !== 'APPROVED') {
        throw new ForbiddenException('Vendor must be verified before creating a store.');
      }

      // Check if store slug already exists
      const existingStore = await this.prisma.store.findUnique({
        where: { slug: storeData.slug }
      });

      if (existingStore) {
        throw new BadRequestException('Store slug already exists. Please choose a different slug.');
      }

      // Parse JSON fields
      let socialMedia = null;
      let businessHours = null;

      if (storeData.socialMedia) {
        try {
          socialMedia = JSON.parse(storeData.socialMedia);
        } catch (error) {
          throw new BadRequestException('Invalid JSON format for social media links.');
        }
      }

      if (storeData.businessHours) {
        try {
          businessHours = JSON.parse(storeData.businessHours);
        } catch (error) {
          throw new BadRequestException('Invalid JSON format for business hours.');
        }
      }

      // Create store
      const store = await this.prisma.store.create({
        data: {
          vendorId: vendorProfile.id,
          name: storeData.name,
          slug: storeData.slug,
          description: storeData.description,
          logo: storeData.logo,
          banner: storeData.banner,
          address: storeData.address,
          city: storeData.city,
          state: storeData.state,
          country: storeData.country,
          postalCode: storeData.postalCode,
          phone: storeData.phone,
          email: storeData.email,
          website: storeData.website,
          socialMedia: socialMedia ? JSON.stringify(socialMedia) : null,
          businessHours: businessHours ? JSON.stringify(businessHours) : null,
        }
      });

      return this.formatStoreResponse(store);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Store with this slug already exists');
      }
      throw new InternalServerErrorException('Failed to create store: ' + error.message);
    }
  }

  async getVendorStore(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: { stores: true }
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found.');
    }

    if (vendorProfile.stores.length === 0) {
      throw new NotFoundException('No store found for this vendor.');
    }

    // Return the first store (assuming one store per vendor for now)
    return this.formatStoreResponse(vendorProfile.stores[0]);
  }

  async updateStore(userId: string, storeId: string, updateData: UpdateStoreDto) {
    // Check if user has vendor profile
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId }
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found.');
    }

    // Check if store exists and belongs to vendor
    const store = await this.prisma.store.findFirst({
      where: { 
        id: storeId,
        vendorId: vendorProfile.id,
        isDeleted: false
      }
    });

    if (!store) {
      throw new NotFoundException('Store not found or does not belong to this vendor.');
    }

    // Parse JSON fields if provided
    let socialMedia = store.socialMedia;
    let businessHours = store.businessHours;

    if (updateData.socialMedia) {
      try {
        const parsed = JSON.parse(updateData.socialMedia);
        socialMedia = JSON.stringify(parsed);
      } catch (error) {
        throw new BadRequestException('Invalid JSON format for social media links.');
      }
    }

    if (updateData.businessHours) {
      try {
        const parsed = JSON.parse(updateData.businessHours);
        businessHours = JSON.stringify(parsed);
      } catch (error) {
        throw new BadRequestException('Invalid JSON format for business hours.');
      }
    }

    // Update store
    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...updateData,
        socialMedia,
        businessHours,
      }
    });

    return this.formatStoreResponse(updatedStore);
  }

  async deleteStore(userId: string, storeId: string) {
    // Check if user has vendor profile
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId }
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found.');
    }

    // Check if store exists and belongs to vendor
    const store = await this.prisma.store.findFirst({
      where: { 
        id: storeId,
        vendorId: vendorProfile.id,
        isDeleted: false
      }
    });

    if (!store) {
      throw new NotFoundException('Store not found or does not belong to this vendor.');
    }

    // Soft delete store
    await this.prisma.store.update({
      where: { id: storeId },
      data: { isDeleted: true }
    });

    return { message: 'Store deleted successfully.' };
  }

  // Admin Methods
  async getAllVendors(query: VendorListQueryDto) {
    const {
      status,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.verification = { status };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get vendors with pagination
    const [vendors, total] = await Promise.all([
      this.prisma.vendorProfile.findMany({
      where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              isEmailVerified: true,
              createdAt: true
            }
          },
          verification: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
              rejectionReason: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
      skip,
        take: limit
      }),
      this.prisma.vendorProfile.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        userId: vendor.userId,
        businessName: vendor.businessName,
        businessDescription: vendor.businessDescription,
        businessEmail: vendor.businessEmail,
        businessPhone: vendor.businessPhone,
        isVerified: vendor.isVerified,
        isActive: vendor.isActive,
        rating: vendor.rating,
        totalSales: vendor.totalSales,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        user: vendor.user,
        verification: vendor.verification
      })),
      pagination: {
      page,
      limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        status,
        isActive,
        search,
        sortBy,
        sortOrder
      }
    };
  }

  async getVendorById(vendorId: string): Promise<VendorDetailDto> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isEmailVerified: true,
            createdAt: true
          }
        },
        verification: true,
        stores: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    return {
      id: vendor.id,
      userId: vendor.userId,
      businessName: vendor.businessName,
      businessDescription: vendor.businessDescription,
      businessAddress: vendor.businessAddress,
      businessEmail: vendor.businessEmail,
      businessPhone: vendor.businessPhone,
      taxId: vendor.taxId,
      isVerified: vendor.isVerified,
      isActive: vendor.isActive,
      rating: vendor.rating,
      totalSales: vendor.totalSales,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      user: vendor.user,
      verification: vendor.verification,
      stores: vendor.stores
    };
  }

  async approveVendorVerification(vendorId: string, adminId: string, notes?: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { verification: true }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    if (!vendor.verification) {
      throw new BadRequestException('No verification request found for this vendor.');
    }

    if (vendor.verification.status !== 'PENDING') {
      throw new BadRequestException(`Verification is already ${vendor.verification.status.toLowerCase()}.`);
    }

    // Update verification status
    await this.prisma.vendorVerification.update({
      where: { id: vendor.verification.id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null
      }
    });

    // Update vendor profile
    await this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { isVerified: true }
    });

    return {
      message: 'Vendor verification approved successfully.',
      vendorId,
      status: 'APPROVED',
      reviewedAt: new Date(),
      reviewedBy: adminId
    };
  }

  async rejectVendorVerification(vendorId: string, adminId: string, reason: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { verification: true }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    if (!vendor.verification) {
      throw new BadRequestException('No verification request found for this vendor.');
    }

    if (vendor.verification.status !== 'PENDING') {
      throw new BadRequestException(`Verification is already ${vendor.verification.status.toLowerCase()}.`);
    }

    // Update verification status
    await this.prisma.vendorVerification.update({
      where: { id: vendor.verification.id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    });

    // Update vendor profile
    await this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { isVerified: false }
    });

    return {
      message: 'Vendor verification rejected.',
      vendorId,
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedBy: adminId
    };
  }

  // Helper Methods
  private formatStoreResponse(store: any) {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      logo: store.logo,
      banner: store.banner,
      address: store.address,
      city: store.city,
      state: store.state,
      country: store.country,
      postalCode: store.postalCode,
      phone: store.phone,
      email: store.email,
      website: store.website,
      socialMedia: store.socialMedia ? JSON.parse(store.socialMedia) : null,
      businessHours: store.businessHours ? JSON.parse(store.businessHours) : null,
      isActive: store.isActive,
      rating: store.rating,
      totalProducts: store.totalProducts,
      totalOrders: store.totalOrders,
      totalSales: store.totalSales,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt
    };
  }
}