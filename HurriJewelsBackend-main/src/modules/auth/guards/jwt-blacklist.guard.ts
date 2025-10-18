import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify the token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.prisma.tokenBlacklist.findUnique({
        where: { token },
      });

      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Check if token has expired (additional safety check)
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token has expired');
      }

      // Don't set user here - let JwtStrategy handle it
      // request.user will be set by JwtStrategy after database lookup
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader: string | undefined = request.headers?.authorization || request.headers?.Authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [scheme, token] = authHeader.split(' ');
      if (scheme && token && scheme.toLowerCase() === 'bearer') {
        return token;
      }
    }
    // Fallbacks: x-access-token, query, cookies
    return (
      request.headers?.['x-access-token'] ||
      request.query?.access_token ||
      request.cookies?.access_token
    );
  }
}
