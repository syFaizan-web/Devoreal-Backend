import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<any>();
    // Expect req.user injected by JWT guard; fallback to headers if needed
    const userId: string | undefined = req?.user?.id || req?.user?.sub;
    const role: string | undefined = req?.user?.role;
    const fullName: string | undefined = req?.user?.fullName;

    this.logger.debug('RequestContext Interceptor - Setting context', { userId, role, fullName, user: req?.user });

    return this.requestContext.run({ userId, role, fullName }, () => next.handle());
  }
}


