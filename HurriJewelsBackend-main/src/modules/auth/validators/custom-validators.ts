import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Password strength validator
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    if (!password) return false;
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
      'qwerty123', 'dragon', 'master', 'hello', 'freedom', 'whatever',
      'qazwsx', 'trustno1', '654321', 'jordan23', 'harley', 'password1',
      'shadow', 'superman', 'qazwsx', 'michael', 'football', 'baseball'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      return false;
    }
    
    // Check for sequential characters
    const sequentialPatterns = [
      '123456', 'abcdef', 'qwerty', 'asdfgh', 'zxcvbn'
    ];
    
    for (const pattern of sequentialPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        return false;
      }
    }
    
    // Check for repeated characters (more than 3 consecutive)
    if (/(.)\1{3,}/.test(password)) {
      return false;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password is too weak. Please choose a stronger password that is not commonly used.';
  }
}

// Phone number validator
@ValidatorConstraint({ name: 'isValidPhoneNumber', async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments) {
    if (!phone) return true; // Optional field
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid length (7-15 digits)
    if (cleaned.length < 7 || cleaned.length > 15) {
      return false;
    }
    
    // Accept various formats including simple numbers
    const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    const simpleNumberRegex = /^\d{7,15}$/;
    
    return phoneRegex.test(phone) || internationalRegex.test(phone) || simpleNumberRegex.test(phone);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Please provide a valid phone number (e.g., +1234567890, (123) 456-7890, 123-456-7890, or 1234567890)';
  }
}

// Name validator
@ValidatorConstraint({ name: 'isValidName', async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
  validate(name: string, args: ValidationArguments) {
    if (!name) return false;
    
    // Check for valid name characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(name)) {
      return false;
    }
    
    // Check for minimum meaningful length (at least 2 characters)
    if (name.trim().length < 2) {
      return false;
    }
    
    // Check for maximum length
    if (name.length > 50) {
      return false;
    }
    
    // Check for consecutive special characters
    if (/[\s\-']{2,}/.test(name)) {
      return false;
    }
    
    // Check that name starts and ends with a letter
    if (!/^[a-zA-Z]/.test(name.trim()) || !/[a-zA-Z]$/.test(name.trim())) {
      return false;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Name must contain only letters, spaces, hyphens, and apostrophes. Must be 2-50 characters long and start/end with a letter.';
  }
}

// Email domain validator
@ValidatorConstraint({ name: 'isValidEmailDomain', async: false })
export class IsValidEmailDomainConstraint implements ValidatorConstraintInterface {
  validate(email: string, args: ValidationArguments) {
    if (!email) return false;
    
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Block common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
      'yopmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com'
    ];
    
    if (disposableDomains.includes(domain.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Please use a valid email address from a trusted domain.';
  }
}

// Decorator functions
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneNumberConstraint,
    });
  };
}

export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidNameConstraint,
    });
  };
}

export function IsValidEmailDomain(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidEmailDomainConstraint,
    });
  };
}

// Password confirmation validator
@ValidatorConstraint({ name: 'passwordsMatch', async: false })
export class PasswordsMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as any;
    return confirmPassword === object.password;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Passwords do not match';
  }
}

export function PasswordsMatch(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: PasswordsMatchConstraint,
    });
  };
}

