import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, params, query } = request;

    // Get user context
    const { userId, role, fullName } = this.requestContext.getContext();

    // Determine action based on HTTP method
    const action = this.getActionFromMethod(method);
    const entity = this.getEntityFromUrl(url);

    return next.handle().pipe(
      tap(async (data) => {
        try {
          // Only log successful operations
          if (response.statusCode >= 200 && response.statusCode < 300) {
            const entityId = this.extractEntityId(params, body, data);
            
            if (entityId && entity) {
              await this.auditService.log({
                entity,
                entityId,
                action,
                userId,
                meta: {
                  method,
                  url,
                  query,
                  userRole: role,
                  userName: fullName,
                  timestamp: new Date().toISOString(),
                  responseStatus: response.statusCode,
                },
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
              });
            }
          }
        } catch (error) {
          this.logger.error('Failed to create audit log', error.stack, {
            method,
            url,
            userId,
            action,
            entity,
          });
        }
      }),
    );
  }

  private getActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
        return 'READ';
      default:
        return 'UNKNOWN';
    }
  }

  private getEntityFromUrl(url: string): string | null {
    // Extract entity from URL patterns
    const patterns = [
      { pattern: /\/api\/users(\/|$)/, entity: 'User' },
      { pattern: /\/api\/products(\/|$)/, entity: 'Product' },
      { pattern: /\/api\/categories(\/|$)/, entity: 'Category' },
      { pattern: /\/api\/vendors(\/|$)/, entity: 'Vendor' },
      { pattern: /\/api\/orders(\/|$)/, entity: 'Order' },
      { pattern: /\/api\/payments(\/|$)/, entity: 'Payment' },
      { pattern: /\/api\/menu(\/|$)/, entity: 'MenuItem' },
    ];

    for (const { pattern, entity } of patterns) {
      if (pattern.test(url)) {
        return entity;
      }
    }

    return null;
  }

  private extractEntityId(params: any, body: any, responseData: any): string | null {
    // Try to get ID from various sources
    if (params?.id) return params.id;
    if (params?.userId) return params.userId;
    if (params?.productId) return params.productId;
    if (params?.categoryId) return params.categoryId;
    if (params?.vendorId) return params.vendorId;
    if (params?.orderId) return params.orderId;
    
    if (body?.id) return body.id;
    if (body?.userId) return body.userId;
    if (body?.productId) return body.productId;
    if (body?.categoryId) return body.categoryId;
    if (body?.vendorId) return body.vendorId;
    if (body?.orderId) return body.orderId;
    
    if (responseData?.id) return responseData.id;
    if (responseData?.data?.id) return responseData.data.id;
    
    return null;
  }
}
