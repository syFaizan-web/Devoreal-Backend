import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
    };

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new user successfully', async () => {
      mockConfigService.get.mockReturnValue(12);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createUserDto,
          password: expect.any(String), // Hashed password
        }),
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
      }));
      expect(result.password).toBeUndefined();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const userId = '1';
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a user if found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const query = {
      page: 1,
      limit: 10,
      search: 'john',
      role: UserRole.CUSTOMER,
      isActive: true,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    const mockUsers = [
      {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.CUSTOMER,
        isActive: true,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return users with pagination and filtering', async () => {
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll(query);

      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
          role: UserRole.CUSTOMER,
          isActive: true,
        }),
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('update', () => {
    const userId = '1';
    const updateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    const existingUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
    };

    const updatedUser = {
      ...existingUser,
      ...updateUserDto,
      updatedAt: new Date(),
    };

    it('should update user successfully', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(existingUser) // First call for existing user check
        .mockResolvedValueOnce(null); // Second call for email uniqueness check
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const userId = '1';
    const existingUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should soft delete user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({ ...existingUser, isActive: false });

      await service.remove(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
});
