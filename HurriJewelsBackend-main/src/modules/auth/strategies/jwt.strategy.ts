import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          // Check both lowercase and uppercase Authorization header
          const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
          this.logger.debug('JWT Strategy - Token extraction attempt', { 
            hasAuthHeader: !!authHeader,
            headerLength: authHeader?.length,
            startsWithBearer: authHeader?.toLowerCase().startsWith('bearer ')
          });
          return authHeader?.startsWith('Bearer ') || authHeader?.startsWith('bearer ')
            ? authHeader.slice(7)
            : undefined;
        },
        (req: any) => req?.headers?.['x-access-token'],
        (req: any) => req?.query?.access_token,
        (req: any) => req?.cookies?.access_token,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      this.logger.debug('JWT Strategy - Validating payload', { payloadId: payload?.sub, payloadRole: payload?.role });

      if (!payload || !payload.sub) {
        this.logger.error('JWT Strategy - Invalid token payload', { payload });
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        this.logger.error('JWT Strategy - User not found', { userId: payload.sub });
        throw new UnauthorizedException('User not found or inactive');
      }

      if (!user.isActive) {
        this.logger.error('JWT Strategy - User inactive', { userId: payload.sub, email: user.email });
        throw new UnauthorizedException('User not found or inactive');
      }

      this.logger.debug('JWT Strategy - User validated successfully', { userId: user.id, email: user.email });

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('JWT Strategy - Validation failed', { error: error.message, stack: error.stack });
      throw new InternalServerErrorException('Failed to validate user: ' + error.message);
    }
  }
}
