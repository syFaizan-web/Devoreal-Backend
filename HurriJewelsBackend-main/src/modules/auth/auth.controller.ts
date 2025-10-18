import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { SessionDto } from './dto/session.dto';
import { AuthResponse } from './entities/auth.entity';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtBlacklistGuard } from './guards/jwt-blacklist.guard';
import { Public } from './decorators/public.decorator';

import { RateLimitGuard } from './guards/rate-limit.guard';
import { LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT, PASSWORD_RESET_RATE_LIMIT } from './decorators/rate-limit.decorator';
import { ValidationErrorInterceptor } from '../../common/validators/validation-error.interceptor';
import { GoogleOAuthDto } from './dto/google-oauth.dto';
import { FacebookOAuthDto } from './dto/facebook-oauth.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('authentication')
@ApiBearerAuth('JWT-auth')
@Controller('auth')
@UseInterceptors(ValidationErrorInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  // @UseGuards(RateLimitGuard)
  // @REGISTER_RATE_LIMIT
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'User registration',
    description: 'Register a new user account with comprehensive validation'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: AuthResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard, LocalAuthGuard)
  @LOGIN_RATE_LIMIT
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user with email and password'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
  })
  async login(@Request() req, @Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto, req);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(@Request() req): Promise<{ message: string }> {
    const token = req.headers.authorization?.split(' ')[1];
    await this.authService.logout(req.user.id, req.user.sessionId, token);
    return { message: 'Logout successful' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logoutAll(@Request() req): Promise<{ message: string }> {
    await this.authService.logoutAll(req.user.id);
    return { message: 'Logged out from all devices successfully' };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Google OAuth token' })
  @ApiBody({ type: GoogleOAuthDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponse })
  async googleLogin(@Body() body: GoogleOAuthDto): Promise<AuthResponse> {
    return this.authService.googleLogin(body.token);
  }

  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Facebook OAuth token' })
  @ApiBody({ type: FacebookOAuthDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponse })
  async facebookLogin(@Body() body: FacebookOAuthDto): Promise<AuthResponse> {
    return this.authService.facebookLogin(body.token);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, JwtBlacklistGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete user (Authorized: SUPER_ADMIN, ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User soft-deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'User already deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async softDeleteUser(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.authService.softDeleteUser(id, req.user.id);
    return { message: 'User soft-deleted successfully' };
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, JwtBlacklistGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore user (Authorized: SUPER_ADMIN, ADMIN)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'User is not deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async restoreUser(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.authService.restoreUser(id, req.user.id);
    return { message: 'User restored successfully' };
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, JwtBlacklistGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard delete user (Authorized: SUPER_ADMIN)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User permanently deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async hardDeleteUser(@Param('id') id: string): Promise<void> {
    await this.authService.hardDeleteUser(id);
  }

  @Public()
  @Get('apple')
  @ApiOperation({ summary: 'Apple OAuth login (stub)' })
  @ApiResponse({
    status: 200,
    description: 'Apple OAuth endpoint',
  })
  async appleAuth(): Promise<{ message: string }> {
    return { message: 'Apple OAuth endpoint - implementation pending' };
  }

  @Public()
  @Post('forgot-password')
  // @UseGuards(RateLimitGuard)
  // @PASSWORD_RESET_RATE_LIMIT
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send password reset email',
    description: 'Send password reset email to user'
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; token: string; expiresAt: string }> {
    const { token, expiresAt } = await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: 'Password reset token generated successfully', token, expiresAt: expiresAt.toISOString() };
  }

  @Public()
  @Post('reset-password')
  // @UseGuards(RateLimitGuard)
  // @PASSWORD_RESET_RATE_LIMIT
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password using token',
    description: 'Reset user password using valid reset token'
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token, or validation failed',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password while logged in' })
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid current password',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Get('sessions')
  @UseGuards(JwtBlacklistGuard)
  @ApiOperation({ summary: 'List all active sessions for logged-in user' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: [SessionDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  async getSessions(@Request() req): Promise<SessionDto[]> {
    return this.authService.getSessions(req.user.sub);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtBlacklistGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async revokeSession(
    @Request() req,
    @Param('id') sessionId: string,
  ): Promise<void> {
    await this.authService.revokeSession(req.user.sub, sessionId);
  }

  @Get('me')
  @UseGuards(JwtBlacklistGuard)
  @ApiOperation({ summary: 'Get logged-in user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  async getProfile(@Request() req): Promise<any> {
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtBlacklistGuard)
  @ApiOperation({ summary: 'Update logged-in user profile' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    return this.authService.updateProfile(req.user.sub, updateProfileDto);
  }

  @Public()
  @Get('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiParam({ 
    name: 'token', 
    description: 'Email verification token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email verified successfully' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid or expired token' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'User not found' }
      }
    }
  })
  async verifyEmail(@Param('token') token: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.authService.verifyEmail(token);
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Email verification failed' 
      };
    }
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Verification email sent successfully' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or invalid email',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Email is already verified' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'User not found' }
      }
    }
  })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.authService.resendEmailVerification(resendVerificationDto.email);
      return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Failed to send verification email' 
      };
    }
  }

  @Post('test-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test email sending (development only)' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 500, description: 'Email sending failed' })
  async testEmail(@Body() body: { email: string }): Promise<{ message: string }> {
    try {
      await this.authService.testEmailSending(body.email);
      return { message: 'Test email sent successfully' };
    } catch (error) {
      throw new InternalServerErrorException(`Email sending failed: ${error.message}`);
    }
  }
}
