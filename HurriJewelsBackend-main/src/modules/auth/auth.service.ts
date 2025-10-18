import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../../common/email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { SessionDto } from './dto/session.dto';
import { AuthResponse } from './entities/auth.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private googleClient(): OAuth2Client {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    return new OAuth2Client(clientId);
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      if (!email || email.trim() === '') {
        throw new BadRequestException('Email is required');
      }
      if (!password || password.trim() === '') {
        throw new BadRequestException('Password is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to validate user: ' + error.message);
    }
  }

  async login(loginDto: LoginDto, req: any): Promise<AuthResponse> {
    try {
      this.logger.log('User login attempt', { email: loginDto.email });
      
      if (!loginDto.email || loginDto.email.trim() === '') {
        throw new BadRequestException('Email is required');
      }
      if (!loginDto.password || loginDto.password.trim() === '') {
        throw new BadRequestException('Password is required');
      }

      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        this.logger.warn('Login failed - invalid credentials', { email: loginDto.email });
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        this.logger.warn('Login failed - account deactivated', { email: loginDto.email, userId: user.id });
        throw new UnauthorizedException('Account is deactivated');
      }

      // Update last login
      await this.usersService.updateLastLogin(user.id);

      // Create session
      const session = await this.createSession(user.id, req);

      const tokens = await this.generateTokens(user, session.id);

      const computedFullName = (user as any).fullName ?? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim();

      this.logger.log('User login successful', { userId: user.id, email: user.email, role: user.role });
      
      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          fullName: computedFullName,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Login failed', error.stack, { email: loginDto.email });
      throw new InternalServerErrorException('Failed to login: ' + error.message);
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      this.logger.log('User registration attempt', { email: registerDto.email });
      
      // Validate required fields
      if (!registerDto.email || registerDto.email.trim() === '') {
        throw new BadRequestException('Email is required');
      }
      if (!registerDto.password || registerDto.password.trim() === '') {
        throw new BadRequestException('Password is required');
      }
      if (!registerDto.fullName || registerDto.fullName.trim() === '') {
        throw new BadRequestException('Full name is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerDto.email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        this.logger.warn('Registration failed - user already exists', { email: registerDto.email });
        throw new ConflictException('User with this email already exists');
      }

      // Generate and persist an email verification token on the user record
      const preUserTempId = uuidv4(); // temporary for payload uniqueness if needed
      // We'll generate token after we have the user id, but we want flags at creation

      // Determine role from payload (fallback to USER)
      const requestedRole = registerDto.role ?? 'USER';
      this.logger.log('Registration role assignment', { 
        requestedRole, 
        originalRole: registerDto.role,
        email: registerDto.email 
      });

      // Create user with initial flags
      // - isActive: true (user can login before verification)
      // - isEmailVerified: false (needs email verification)
      // - isDeleted: false (user is not deleted)
      const tempUser = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          fullName: registerDto.fullName,
          password: await bcrypt.hash(registerDto.password, 12),
          role: requestedRole as any,
          isActive: true,
          isEmailVerified: false,
          isDeleted: false,
        },
      });

      const verificationToken = this.generateEmailVerificationToken(tempUser.id);
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Store the token on the user record
      const user = await this.prisma.user.update({
        where: { id: tempUser.id },
        data: { emailVerificationToken: verificationToken, emailVerifyTokenExpires: expiryDate, emailVerifiedAt: null } as any,
      });

      // Send email verification
      try {
        await this.emailService.sendEmailVerificationEmail(
          user.email,
          user.fullName || user.email.split('@')[0],
          verificationToken
        );
      } catch (error) {
        this.logger.error('Failed to send verification email', error.stack);
        // do not throw; user can request resend
      }

      const tokens = await this.generateTokens(user);
      
      const computedFullName = (user as any).fullName ?? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim();

      this.logger.log('User registration successful', { userId: user.id, email: user.email, role: user.role });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          fullName: computedFullName,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      this.logger.error('Registration failed', error.stack, { email: registerDto.email });
      throw new InternalServerErrorException('Failed to register user: ' + error.message);
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!refreshToken || refreshToken.trim() === '') {
        throw new BadRequestException('Refresh token is required');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(user);
      
      const computedFullName = (user as any).fullName ?? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim();

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          fullName: computedFullName,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const client = this.googleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google token invalid');
    }

    const email = payload.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create minimal user
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: payload.name || email.split('@')[0],
          avatar: payload.picture || null,
          password: await bcrypt.hash(uuidv4(), 12),
          isEmailVerified: payload.email_verified ?? true,
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const session = await this.createSession(user.id, { headers: { 'user-agent': 'GoogleOAuth' }, ip: undefined, connection: {} });
    const tokens = await this.generateTokens(user, session.id);
    const computedFullName = (user as any).fullName ?? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim();
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: computedFullName,
        role: user.role,
      },
    };
  }

  async facebookLogin(accessToken: string): Promise<AuthResponse> {
    const appId = this.configService.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
    if (!appId || !appSecret) {
      throw new UnauthorizedException('Facebook app credentials are not configured');
    }

    // Validate token and get user info
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const debugResp = await fetch(debugUrl).then(r => r.json() as any);
    if (!debugResp?.data?.is_valid) {
      throw new UnauthorizedException('Facebook token invalid');
    }

    const meUrl = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`;
    const me = await fetch(meUrl).then(r => r.json() as any);
    const email: string | undefined = me?.email;
    if (!email) {
      throw new UnauthorizedException('Facebook account has no email');
    }

    const normalizedEmail = email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: me?.name || normalizedEmail.split('@')[0],
          avatar: me?.picture?.data?.url || null,
          password: await bcrypt.hash(uuidv4(), 12),
          isEmailVerified: true,
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const session = await this.createSession(user.id, { headers: { 'user-agent': 'FacebookOAuth' }, ip: undefined, connection: {} });
    const tokens = await this.generateTokens(user, session.id);
    const computedFullName = (user as any).fullName ?? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim();
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: computedFullName,
        role: user.role,
      },
    };
  }

  private async generateTokens(user: any, sessionId?: string) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      ...(sessionId && { sessionId })
    };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async logout(userId: string, sessionId?: string, accessToken?: string): Promise<void> {
    // Blacklist the access token if provided
    if (accessToken) {
      try {
        const payload = this.jwtService.verify(accessToken, {
          secret: this.configService.get('JWT_SECRET'),
        });
        
        await this.prisma.tokenBlacklist.create({
          data: {
            token: accessToken,
            userId: userId,
            expiresAt: new Date(payload.exp * 1000), // Convert from Unix timestamp
          },
        });
      } catch (error) {
        // Token might be invalid, but we still proceed with session cleanup
        this.logger.warn('Could not blacklist token', { error: error.message });
      }
    }

    // Deactivate the current session
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId, isActive: true },
        data: { isActive: false }
      });
    } else {
      // If no session ID provided, deactivate the most recent session
      await this.prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    // Get all active sessions to blacklist their tokens
    const activeSessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: { id: true }
    });

    // Blacklist all tokens for this user (we'll need to get them from somewhere)
    // For now, we'll just deactivate sessions and let tokens expire naturally
    // In a more sophisticated system, you'd store the access tokens with sessions

    // Deactivate all sessions for the user
    await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });
  }

  async forgotPassword(email: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate UUID token and expiry (1 hour)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Try model-based token storage; fall back to user fields if model not present
    try {
      await (this.prisma as any).passwordResetToken.updateMany({
        where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });

      await (this.prisma as any).passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });
    } catch (_) {
      // Fallback: store on user record
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: expiresAt },
      });
    }

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token, user.fullName);
    } catch (error) {
      this.logger.error('Failed to send password reset email', error.stack);
      // Still return the token even if email fails, for development purposes
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      this.logger.debug(`Password reset link: ${frontendUrl}/reset-password?token=${token}`);
    }

    return { token, expiresAt };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Prefer model-based token validation
    try {
      const tokenRecord = await (this.prisma as any).passwordResetToken.findUnique({ where: { token } });

      if (!tokenRecord) {
        throw new BadRequestException('Invalid or expired token');
      }
      if (tokenRecord.used) {
        throw new BadRequestException('Token already used');
      }
      if (tokenRecord.expiresAt < new Date()) {
        throw new BadRequestException('Token has expired');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: tokenRecord.userId },
          data: { password: hashedPassword },
        }),
        (this.prisma as any).passwordResetToken.update({
          where: { token },
          data: { used: true },
        }),
      ]);
      return;
    } catch (_) {
      // Fallback: user-embedded token
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
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

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }

  async getSessions(userId: string): Promise<SessionDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActivity: 'desc' }
    });

    return sessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        address: true,
        dob: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<any> {
    // Convert dob string to Date if provided
    const updateData: any = { ...updateProfileDto };
    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        avatar: true,
        address: true,
        dob: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return user;
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Check if this is an email verification token
      if (payload.type !== 'email_verification') {
        throw new BadRequestException('Invalid token type. This token is not for email verification.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Ensure token matches what we stored (if present)
      if (user.emailVerificationToken && user.emailVerificationToken !== token) {
        throw new BadRequestException('Invalid verification token.');
      }

      // Ensure token not expired if we store expiry
      if ((user as any).emailVerifyTokenExpires && (user as any).emailVerifyTokenExpires < new Date()) {
        throw new BadRequestException('Verification token has expired. Please request a new verification email.');
      }

      // Update email verification status (user is already active)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerifyTokenExpires: null,
          emailVerifiedAt: new Date(),
        } as any
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Verification token has expired. Please request a new verification email.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid verification token.');
      }
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async assignRole(userId: string, role: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any }
    });
  }

  async getRoles(userId: string): Promise<{ roles: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { roles: [user.role] };
  }

  private async createSession(userId: string, req: any): Promise<any> {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    return await this.prisma.session.create({
      data: {
        userId,
        userAgent,
        ipAddress,
        isActive: true,
        lastActivity: new Date()
      }
    });
  }

  // Cleanup expired tokens from blacklist (call this periodically)
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }

  // Generate email verification token
  private generateEmailVerificationToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'email_verification',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '24h', // Email verification tokens expire in 24 hours
    });
  }

  // Send email verification
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, isEmailVerified: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = this.generateEmailVerificationToken(userId);
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // store token
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerificationToken: verificationToken, emailVerifyTokenExpires: expiryDate, emailVerifiedAt: null } as any });

    try {
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        user.fullName || user.email.split('@')[0],
        verificationToken
      );
    } catch (error) {
      this.logger.error('Failed to send verification email', error.stack);
      // Don't throw error to avoid breaking flow
    }
  }

  // Send email verification by email address
  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, isEmailVerified: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = this.generateEmailVerificationToken(user.id);
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: verificationToken, emailVerifyTokenExpires: expiryDate, emailVerifiedAt: null } as any });

    try {
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        user.fullName || user.email.split('@')[0],
        verificationToken
      );
    } catch (error) {
      this.logger.error('Failed to send verification email', error.stack);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async testEmailSending(email: string): Promise<void> {
    await this.emailService.sendPasswordResetEmail(email, 'test-token-123', 'Test User');
  }

  async softDeleteUser(targetUserId: string, actorUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if ((user as any).isDeleted) {
      throw new BadRequestException('User is already deleted');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: actorUserId } as any,
    });
  }

  async restoreUser(targetUserId: string, actorUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!(user as any).isDeleted) {
      throw new BadRequestException('User is not deleted');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isDeleted: false, deletedAt: null, deletedBy: null, updatedBy: actorUserId } as any,
    });
  }

  async hardDeleteUser(targetUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.delete({ where: { id: targetUserId } });
  }
}
