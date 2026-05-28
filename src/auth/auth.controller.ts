import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔥 LOGIN
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res) {
    const data = await this.authService.login(body);

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: false, // true nếu HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return {
      token: data.token,
    };
  }

  // 🔄 REFRESH TOKEN

  @Post('refresh-token')
  refreshToken(@Req() req) {
    const token = req.cookies.refreshToken;

    if (!token) {
      throw new BadRequestException('Thiếu refresh token');
    }

    return this.authService.refreshToken({ refreshToken: token });
  }
}
