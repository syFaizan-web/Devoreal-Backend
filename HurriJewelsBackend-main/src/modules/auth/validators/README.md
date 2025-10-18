# Authentication Validation System

This document describes the comprehensive validation system implemented for the HurriJewels authentication module.

## Overview

The validation system provides professional-grade security and user experience features including:

- **Strong Password Requirements**: Complex password validation with common password detection
- **Email Validation**: Comprehensive email format validation with disposable email blocking
- **Name Validation**: Proper name format validation supporting international names
- **Phone Number Validation**: Flexible phone number format validation
- **Rate Limiting**: Protection against brute force attacks
- **Professional Error Messages**: User-friendly validation feedback

## Features

### 1. Password Validation

#### Requirements

- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%\*?&)

#### Security Features

- Blocks common weak passwords (password, 123456, qwerty, etc.)
- Prevents sequential patterns (123456, abcdef, qwerty)
- Blocks repeated characters (aaaa, 1111)
- Custom password strength validator

#### Example Valid Passwords

```
SecurePass123!
MyStr0ng@Pass
Complex#Pass1
Valid$Pass2
Good%Pass3
```

#### Example Invalid Passwords

```
password123    // Too common
123456         // Sequential pattern
aaaa1111       // Repeated characters
weak           // Too short, no complexity
```

### 2. Email Validation

#### Features

- RFC-compliant email format validation
- Disposable email domain blocking
- Email normalization (lowercase, trim)
- Maximum length validation (254 characters)

#### Blocked Domains

- 10minutemail.com
- tempmail.org
- guerrillamail.com
- mailinator.com
- yopmail.com
- temp-mail.org
- throwaway.email
- getnada.com

#### Example Valid Emails

```
user@example.com
test.email@domain.co.uk
user+tag@example.org
user123@test-domain.com
```

### 3. Name Validation

#### Requirements

- 2-50 characters long
- Only letters, spaces, hyphens, apostrophes, and periods
- Must start and end with a letter
- No consecutive special characters

#### Supported Formats

```
John Doe
Jean-Pierre
O'Connor
Mary Jane Smith
Dr. Smith
```

#### Invalid Examples

```
J0hn          // Contains numbers
-John         // Starts with special character
John-         // Ends with special character
John  Doe     // Consecutive spaces
```

### 4. Phone Number Validation

#### Supported Formats

- International: +1234567890
- US Format: (123) 456-7890
- Dash Format: 123-456-7890
- Dot Format: 123.456.7890
- Mixed: +1-234-567-8900

#### Requirements

- 7-15 digits (after cleaning)
- Valid international format
- Optional field

### 5. Rate Limiting

#### Login Attempts

- 5 attempts per 15 minutes per IP/email combination
- Blocks after limit exceeded
- Custom error message with retry time

#### Registration Attempts

- 3 registrations per hour per IP
- Prevents spam registrations

#### Password Reset Attempts

- 3 attempts per hour per IP
- Prevents abuse of reset functionality

### 6. Error Handling

#### Validation Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["Please provide a valid email address"],
    "password": [
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Rate Limit Error Format

```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Please try again in 15 minutes.",
  "retryAfter": 900,
  "resetTime": "2024-01-01T00:15:00.000Z"
}
```

## Implementation

### Custom Validators

The system includes custom validators in `custom-validators.ts`:

- `@IsStrongPassword()`: Password strength validation
- `@IsValidPhoneNumber()`: Phone number format validation
- `@IsValidName()`: Name format validation
- `@IsValidEmailDomain()`: Email domain validation

### Rate Limiting

Rate limiting is implemented using:

- `RateLimitGuard`: Custom guard for rate limiting
- `@RateLimit()`: Decorator for configuring rate limits
- Predefined configurations: `@LOGIN_RATE_LIMIT`, `@REGISTER_RATE_LIMIT`, `@PASSWORD_RESET_RATE_LIMIT`

### Error Interceptor

The `ValidationErrorInterceptor` provides:

- Consistent error formatting
- Field-specific error messages
- Professional error responses

## Usage Examples

### Login Validation

```typescript
@Post('login')
@UseGuards(RateLimitGuard, LocalAuthGuard)
@LOGIN_RATE_LIMIT
async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
  return this.authService.login(loginDto, req);
}
```

### Registration Validation

```typescript
@Post('register')
@UseGuards(RateLimitGuard)
@REGISTER_RATE_LIMIT
async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
  return this.authService.register(registerDto);
}
```

## Testing

Comprehensive test suite in `validation.test.ts` covers:

- Valid and invalid email formats
- Password strength validation
- Name format validation
- Phone number validation
- Rate limiting scenarios
- Error message formatting

Run tests with:

```bash
npm test -- --testPathPattern=validation.test.ts
```

## Security Considerations

1. **Password Security**: Strong password requirements prevent common attacks
2. **Rate Limiting**: Prevents brute force and spam attacks
3. **Email Validation**: Blocks disposable emails to prevent abuse
4. **Input Sanitization**: All inputs are trimmed and normalized
5. **Error Messages**: Don't leak sensitive information

## Configuration

Rate limiting can be configured by modifying the decorator options:

```typescript
export const CUSTOM_RATE_LIMIT = RateLimit({
  ttl: 3600, // 1 hour
  limit: 10, // 10 attempts
  message: 'Custom rate limit message',
  skipSuccessfulRequests: true,
});
```

## Future Enhancements

1. **Redis Integration**: Replace in-memory rate limiting with Redis
2. **CAPTCHA Integration**: Add CAPTCHA for suspicious activity
3. **Device Fingerprinting**: Enhanced rate limiting based on device
4. **Progressive Delays**: Increasing delays for repeated violations
5. **Admin Override**: Admin tools for managing rate limits

