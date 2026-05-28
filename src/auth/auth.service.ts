import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createRefToken, createToken, decodeToken } from '../config/jwt.js';
import { ldapLogin } from 'src/config/ldap.services';

@Injectable()
export class AuthService {
  prisma = new PrismaClient();

  async login(body: any) {
    const { userName, password } = body;

    if (!userName) {
      throw new BadRequestException('Tài khoản không đúng');
    }

    if (!password) {
      throw new BadRequestException('Mật khẩu không đúng');
    }

    let user = await this.prisma.users.findFirst({
      where: {
        userName,
        status: true,
      },
    });

    // 🔥 1. Nếu user tồn tại
    if (user) {
      // 👉 LOCAL
      if (user.authType === 'local') {
        const checkPass = await bcrypt.compare(password, user.pass);

        if (!checkPass) {
          throw new UnauthorizedException('Mật khẩu không đúng');
        }
      }

      // 👉 DOMAIN
      if (user.authType === 'domain') {
        await ldapLogin(userName, password);
      }
    }

    // 🔥 2. Nếu user chưa tồn tại → thử LDAP
    if (!user) {
      try {
        const ldapUser: any = await ldapLogin(userName, password);

        // 👉 tạo user domain với info thật
        user = await this.prisma.users.create({
          data: {
            userName,
            fullName: ldapUser.cn || userName,
            email: ldapUser.mail || null,
            authType: 'domain',
            status: true,
            createDate: new Date(),
          },
        });
      } catch (err: any) {
        throw new UnauthorizedException(err.message);
      }
    }

    // 🔥 3. TẠO TOKEN
    const token = createToken({
      userId: user.userId,
      vaiTroId: user.vaiTroId,
      email: user.email,
      fullName: user.fullName,
    });

    const refToken = createRefToken({
      userId: user.userId,
    });

    // 🔥 4. LƯU REFRESH TOKEN
    await this.prisma.users.update({
      where: { userId: user.userId },
      data: {
        refreshToken: await bcrypt.hash(refToken, 10),
      },
    });

    return {
      message: 'Đăng nhập thành công',
      token,
      refreshToken: refToken,
    };
  }

  // ----- REFRESH TOKEN ----- //
  async refreshToken(body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Thiếu refresh token');
    }

    let decoded: any;
    try {
      decoded = decodeToken(body.refreshToken);
    } catch {
      throw new UnauthorizedException({
        message: 'Refresh token không hợp lệ',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await this.prisma.users.findFirst({
      where: {
        userId: decoded.data.userId,
        status: true,
      },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('User không hợp lệ');
    }

    // so sánh token
    const isMatch = await bcrypt.compare(body.refreshToken, user.refreshToken);

    if (!isMatch) {
      throw new UnauthorizedException('Refresh token không đúng');
    }

    // 👉 chỉ tạo access token mới
    const newAccessToken = createToken({
      userId: user.userId,
      vaiTroId: user.vaiTroId,
      email: user.email,
      logo: user.logo,
      fullName: user.fullName,
      authType: user.authType,
    });

    return {
      message: 'Refresh token thành công',
      token: newAccessToken,
      refreshToken: body.refreshToken, // giữ nguyên
    };
  }
}
