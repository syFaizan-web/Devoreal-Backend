import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      details = exception.getResponse();
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      // Handle Prisma errors
      const prismaError = exception as any;
      
      switch (prismaError.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          details = { 
            field: prismaError.meta?.target,
            constraint: 'unique_constraint_violation'
          };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          details = { 
            cause: 'record_not_found',
            model: prismaError.meta?.model
          };
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'foreign_key_constraint_violation'
          };
          break;
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid relation';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'relation_violation'
          };
          break;
        case 'P2001':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          details = { 
            cause: 'record_not_found',
            constraint: 'unique_constraint_not_found'
          };
          break;
        case 'P2006':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid value provided';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'value_validation_failed'
          };
          break;
        case 'P2011':
          status = HttpStatus.BAD_REQUEST;
          message = 'Null constraint violation';
          details = { 
            field: prismaError.meta?.constraint,
            constraint: 'null_constraint_violation'
          };
          break;
        case 'P2012':
          status = HttpStatus.BAD_REQUEST;
          message = 'Missing required value';
          details = { 
            field: prismaError.meta?.path,
            constraint: 'missing_required_value'
          };
          break;
        case 'P2016':
          status = HttpStatus.BAD_REQUEST;
          message = 'Query interpretation error';
          details = { 
            cause: 'query_interpretation_error',
            details: prismaError.meta?.details
          };
          break;
        case 'P2017':
          status = HttpStatus.BAD_REQUEST;
          message = 'Records for relation are not connected';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'relation_not_connected'
          };
          break;
        case 'P2018':
          status = HttpStatus.BAD_REQUEST;
          message = 'Required connected records not found';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'required_connected_records_not_found'
          };
          break;
        case 'P2019':
          status = HttpStatus.BAD_REQUEST;
          message = 'Input error';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'input_error'
          };
          break;
        case 'P2020':
          status = HttpStatus.BAD_REQUEST;
          message = 'Value out of range';
          details = { 
            field: prismaError.meta?.field_name,
            constraint: 'value_out_of_range'
          };
          break;
        case 'P2021':
          status = HttpStatus.NOT_FOUND;
          message = 'Table does not exist';
          details = { 
            table: prismaError.meta?.table,
            constraint: 'table_not_found'
          };
          break;
        case 'P2022':
          status = HttpStatus.NOT_FOUND;
          message = 'Column does not exist';
          details = { 
            column: prismaError.meta?.column,
            constraint: 'column_not_found'
          };
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database operation failed';
          details = { 
            code: prismaError.code,
            constraint: 'unknown_database_error'
          };
      }
    } else if (exception && typeof exception === 'object' && 'message' in exception) {
      // Handle generic errors with message
      const genericError = exception as any;
      if (genericError.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation error';
        details = { message: genericError.message };
      }
    }

    const reqId = (request as any)?.headers?.['x-request-id'] || (request as any)?.id;
    const userId = (request as any)?.user?.id;
    const userAgent = (request as any)?.headers?.['user-agent'];
    const ip = (request as any)?.ip || (request as any)?.connection?.remoteAddress;

    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const redactions = ['password', 'token', 'authorization', 'creditCard', 'cvv'];
      const cloned: any = Array.isArray(obj) ? [...obj] : { ...obj };
      for (const key of Object.keys(cloned)) {
        if (redactions.includes(key)) cloned[key] = '[REDACTED]';
        else if (typeof cloned[key] === 'object') cloned[key] = sanitize(cloned[key]);
      }
      return cloned;
    };

    const logFullBody = (process.env.LOG_FULL_BODY || 'false').toLowerCase() === 'true';
    const bodyForLog = logFullBody ? sanitize((request as any)?.body) : undefined;

    this.logger.error('http_exception', {
      event: 'http_exception',
      context: 'GlobalExceptionFilter',
      method: (request as any)?.method,
      url: (request as any)?.url,
      requestId: reqId,
      statusCode: status,
      message,
      errorName: (exception as any)?.name,
      stack: exception instanceof Error ? exception.stack : undefined,
      userId,
      ip,
      userAgent,
      requestBodySanitized: bodyForLog,
      details,
    });

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      details,
    };

    response.status(status).send(errorResponse);
  }
}
