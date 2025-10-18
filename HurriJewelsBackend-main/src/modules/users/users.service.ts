import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import type { $Enums } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    options?: { initialFlags?: { isActive?: boolean; isDeleted?: boolean; isEmailVerified?: boolean; emailVerificationToken?: string }, sendVerificationEmail?: boolean }
  ): Promise<User> {
    try {
      this.logger.log('Creating new user', { email: createUserDto.email });
      
      // Validate required fields
      if (!createUserDto.email || createUserDto.email.trim() === '') {
        throw new BadRequestException('Email is required');
      }
      if (!createUserDto.password || createUserDto.password.trim() === '') {
        throw new BadRequestException('Password is required');
      }
      if (!createUserDto.fullName || createUserDto.fullName.trim() === '') {
        throw new BadRequestException('Full name is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createUserDto.email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        this.logger.warn('User creation failed - email already exists', { email: createUserDto.email });
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        this.configService.get('BCRYPT_ROUNDS', 12),
      );

      // Create user with enforced initial flags
      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          fullName: createUserDto.fullName,
          phone: createUserDto.phone || null,
          avatar: createUserDto.avatar,
          role: (createUserDto.role as unknown as $Enums.Role),
          password: hashedPassword,
          isActive: options?.initialFlags?.isActive ?? true,
          isDeleted: options?.initialFlags?.isDeleted ?? false,
          isEmailVerified: options?.initialFlags?.isEmailVerified ?? false,
        },
      });

      // Generate and store email verification token
      const tokenPayload = { sub: user.id, type: 'email_verification', iat: Math.floor(Date.now() / 1000) } as any;
      const verificationToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '24h',
      });
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationToken: verificationToken, emailVerifyTokenExpires: expiryDate, emailVerifiedAt: null } as any,
      });

      // Optionally send verification email
      if (options?.sendVerificationEmail !== false) {
        try {
          await this.emailService.sendEmailVerificationEmail(
            updatedUser.email,
            updatedUser.fullName || updatedUser.email.split('@')[0],
            verificationToken,
          );
        } catch (err) {
          this.logger.error('Failed to send verification email', (err as any)?.stack);
        }
      }

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      
      this.logger.log('User created successfully', { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      this.logger.error('Failed to create user', error.stack, { email: createUserDto.email });
      throw new InternalServerErrorException('Failed to create user: ' + error.message);
    }
  }

  async findAll(query: QueryUserDto): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    try {
      const { page = 1, limit = 10, search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Validate pagination parameters
      if (page < 1) {
        throw new BadRequestException('Page number must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Build where clause
      const where: any = { isDeleted: false };
      
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get total count
      const total = await this.prisma.user.count({ where });

      // Get users with pagination and sorting
      const users = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        users: users as User[],
        total,
        page,
        limit,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch users: ' + error.message);
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      const user = await this.prisma.user.findFirst({
        where: { id, isDeleted: false } as any,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user as User;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch user: ' + error.message);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      if (!email || email.trim() === '') {
        throw new BadRequestException('Email is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return null;
      }

      // Create a User entity instance with computed properties
      const userEntity = new User();
      Object.assign(userEntity, user);
      return userEntity;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to find user by email: ' + error.message);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      // Validate email format if being updated
      if (updateUserDto.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateUserDto.email)) {
          throw new BadRequestException('Invalid email format');
        }
      }

      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser || (existingUser as any).isDeleted) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Check if email is being updated and if it's already taken
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateUserDto.email },
        });

        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Update user
      const prismaUpdateData: any = { ...updateUserDto };
      if ((updateUserDto as any).role) {
        prismaUpdateData.role = ((updateUserDto as any).role as unknown as $Enums.Role);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: prismaUpdateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create a User entity instance with computed properties
      const userEntity = new User();
      Object.assign(userEntity, updatedUser);
      return userEntity;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException('Failed to update user: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || (existingUser as any).isDeleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete by marking isDeleted and deactivate account
    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false, deletedAt: new Date() } as any,
    });
  }

  async hardRemove(id: string): Promise<void> {
    // Perform soft delete instead of hard delete to preserve audit trail
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() } as any,
    });
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false, deletedAt: new Date(), deletedBy: userId } as any,
    });
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, deletedBy: null, updatedBy: userId } as any,
    });
  }

  async toggleStatus(id: string, userId?: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const togglingToActive = !existing.isActive;
    await this.prisma.user.update({
      where: { id },
      data: { 
        isActive: togglingToActive,
        // When activating, ensure isDeleted is false
        ...(togglingToActive ? { isDeleted: false } : {}),
        updatedBy: userId 
      } as any,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async verifyEmail(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.prisma.user.update({
      where: { id },
      data: { 
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });
  }

  async setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.configService.get('BCRYPT_ROUNDS', 12),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }
}
