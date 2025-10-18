import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '../../../common/enums/role.enum';

describe('Authentication Validation Tests', () => {
  describe('LoginDto Validation', () => {
    it('should pass with valid email and password', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
      });

      const errors = await validate(loginDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid email format', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: 'invalid-email',
        password: 'SecurePass123!',
      });

      const errors = await validate(loginDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with weak password', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: 'user@example.com',
        password: 'weak',
      });

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail with common password', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: 'user@example.com',
        password: 'password123',
      });

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail with empty email', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: '',
        password: 'SecurePass123!',
      });

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should fail with empty password', async () => {
      const loginDto = plainToClass(LoginDto, {
        email: 'user@example.com',
        password: '',
      });

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });
  });

  describe('RegisterDto Validation', () => {
    it('should pass with valid registration data', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: Role.USER,
      });

      const errors = await validate(registerDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid first name', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'J0hn', // Contains number
        lastName: 'Doe',
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'firstName')).toBe(true);
    });

    it('should fail with invalid last name', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'D0e', // Contains number
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'lastName')).toBe(true);
    });

    it('should fail with invalid phone number', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: 'invalid-phone',
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'phone')).toBe(true);
    });

    it('should pass with valid phone number formats', async () => {
      const validPhones = [
        '+1234567890',
        '(123) 456-7890',
        '123-456-7890',
        '123.456.7890',
        '+1-234-567-8900',
      ];

      for (const phone of validPhones) {
        const registerDto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          phone,
        });

        const errors = await validate(registerDto);
        const phoneErrors = errors.filter(error => error.property === 'phone');
        expect(phoneErrors).toHaveLength(0);
      }
    });

    it('should fail with disposable email domain', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@tempmail.org',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should fail with name starting with special character', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: '-John',
        lastName: 'Doe',
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'firstName')).toBe(true);
    });

    it('should fail with name ending with special character', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe-',
      });

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'lastName')).toBe(true);
    });

    it('should pass with valid name containing hyphen and apostrophe', async () => {
      const registerDto = plainToClass(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: "Jean-Pierre",
        lastName: "O'Connor",
      });

      const errors = await validate(registerDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Password Strength Validation', () => {
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
    ];

    const strongPasswords = [
      'SecurePass123!',
      'MyStr0ng@Pass',
      'Complex#Pass1',
      'Valid$Pass2',
      'Good%Pass3',
    ];

    it('should reject weak passwords', async () => {
      for (const weakPassword of weakPasswords) {
        const loginDto = plainToClass(LoginDto, {
          email: 'user@example.com',
          password: weakPassword,
        });

        const errors = await validate(loginDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'password')).toBe(true);
      }
    });

    it('should accept strong passwords', async () => {
      for (const strongPassword of strongPasswords) {
        const loginDto = plainToClass(LoginDto, {
          email: 'user@example.com',
          password: strongPassword,
        });

        const errors = await validate(loginDto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Email Validation', () => {
    const validEmails = [
      'user@example.com',
      'test.email@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com',
    ];

    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user@.com',
      'user..name@example.com',
      'user@example..com',
    ];

    it('should accept valid email formats', async () => {
      for (const email of validEmails) {
        const loginDto = plainToClass(LoginDto, {
          email,
          password: 'SecurePass123!',
        });

        const errors = await validate(loginDto);
        const emailErrors = errors.filter(error => error.property === 'email');
        expect(emailErrors).toHaveLength(0);
      }
    });

    it('should reject invalid email formats', async () => {
      for (const email of invalidEmails) {
        const loginDto = plainToClass(LoginDto, {
          email,
          password: 'SecurePass123!',
        });

        const errors = await validate(loginDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'email')).toBe(true);
      }
    });
  });
});

