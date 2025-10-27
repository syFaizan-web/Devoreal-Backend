import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization || request.headers.Authorization;
    const lowerAuthHeader = request.headers.authorization?.toLowerCase() || '';
    
    this.logger.warn('JWT Guard - Request headers check', { 
      authHeader: authHeader ? `${authHeader.substring(0, 50)}...` : 'MISSING',
      authHeaderLength: authHeader?.length,
      authHeaderLowerCase: authHeader?.toLowerCase(),
      startsWithBearer: lowerAuthHeader.startsWith('bearer '),
      url: request.url, 
      method: request.method,
      contentType: request.headers['content-type'],
      allHeaderKeys: Object.keys(request.headers),
      rawHeaders: request.headers
    });

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug('JWT Guard - handleRequest', { 
      hasError: !!err, 
      hasUser: !!user, 
      errorMessage: err?.message,
      infoMessage: info?.message,
      infoName: info?.name
    });

    if (err) {
      this.logger.error('JWT Guard - Error during authentication', { 
        errorMessage: err.message,
        errorName: err.name,
        stack: err.stack
      });
      throw err;
    }

    if (!user) {
      this.logger.error('JWT Guard - No user found', { infoMessage: info?.message, infoName: info?.name });
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.debug('JWT Guard - Authentication successful', { userId: user.id, email: user.email });
    return user;
  }
}
