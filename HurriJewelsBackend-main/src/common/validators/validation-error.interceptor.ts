import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          
          if (typeof response === 'object' && 'message' in response) {
            // Check if it's already a ValidationError array from class-validator
            if (Array.isArray(response.message) && response.message.length > 0 && response.message[0] instanceof ValidationError) {
              const formattedErrors = this.formatClassValidatorErrors(response.message);
              
              throw new BadRequestException({
                statusCode: 400,
                message: 'Validation failed',
                errors: formattedErrors,
                timestamp: new Date().toISOString(),
              });
            } else {
              // Handle string messages
              const messages = Array.isArray(response.message) 
                ? response.message 
                : [response.message];
              
              const formattedErrors = this.formatValidationErrors(messages);
              
              throw new BadRequestException({
                statusCode: 400,
                message: 'Validation failed',
                errors: formattedErrors,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
        
        throw error;
      }),
    );
  }

  private formatClassValidatorErrors(validationErrors: ValidationError[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    validationErrors.forEach((error) => {
      const field = error.property;
      const messages: string[] = [];
      
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      
      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => {
          if (child.constraints) {
            messages.push(...Object.values(child.constraints));
          }
        });
      }
      
      if (messages.length > 0) {
        errors[field] = messages;
      }
    });
    
    return errors;
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    messages.forEach((message) => {
      // Extract field name from validation message
      const fieldMatch = message.match(/^(\w+)\s/);
      if (fieldMatch) {
        const field = fieldMatch[1].toLowerCase();
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(message);
      } else {
        // If no field name found, add to general errors
        if (!errors['general']) {
          errors['general'] = [];
        }
        errors['general'].push(message);
      }
    });
    
    return errors;
  }
}

// Helper function to create user-friendly validation messages
export function createValidationMessage(field: string, constraint: string, value?: any): string {
  const messages: Record<string, Record<string, string>> = {
    email: {
      isEmail: 'Please enter a valid email address',
      isNotEmpty: 'Email is required',
      maxLength: 'Email address is too long',
    },
    password: {
      isNotEmpty: 'Password is required',
      minLength: 'Password must be at least 8 characters long',
      maxLength: 'Password is too long',
      matches: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
    firstName: {
      isNotEmpty: 'First name is required',
      isString: 'First name must be text only',
      length: 'First name must be between 2 and 50 characters',
    },
    lastName: {
      isNotEmpty: 'Last name is required',
      isString: 'Last name must be text only',
      length: 'Last name must be between 2 and 50 characters',
    },
    phone: {
      isString: 'Phone number must be text only',
      maxLength: 'Phone number is too long',
    },
  };

  return messages[field]?.[constraint] || `${field} validation failed`;
}

