// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { checkToken } from './jwt';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean {
//     const req = context.switchToHttp().getRequest();

//     const url = req.url;

//     // 👇 bỏ qua login
//     if (url.includes('/auth/login') || url.includes('/auth/refresh-token')) {
//       return true;
//     }

//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       throw new UnauthorizedException('Thiếu token');
//     }

//     const token = authHeader.split(' ')[1];

//     if (!token) {
//       throw new UnauthorizedException('Thiếu token');
//     }

//     try {
//       const decoded = checkToken(token);

//       req.user = decoded;
//       return true;
//     } catch (error: any) {
//       if (error.name === 'TokenExpiredError') {
//         throw new UnauthorizedException({
//           message: 'Token đã hết hạn',
//           code: 'TOKEN_EXPIRED',
//         });
//       }
//     }
//   }
// }
// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { checkToken } from './jwt';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();

//     const url = request.originalUrl || request.url;

//     // Những API không cần token
//     const publicUrls = [
//       '/auth/login',
//       '/auth/refresh-token',
//       '/swagger',
//       '/swagger-json',
//     ];

//     const isPublicUrl = publicUrls.some((publicUrl) => url.includes(publicUrl));

//     if (isPublicUrl) {
//       return true;
//     }

//     const authHeader = request.headers.authorization;

//     if (!authHeader) {
//       throw new UnauthorizedException({
//         message: 'Thiếu token',
//         code: 'TOKEN_MISSING',
//       });
//     }

//     const [type, token] = authHeader.trim().split(/\s+/);

//     if (type?.toLowerCase() !== 'bearer' || !token) {
//       throw new UnauthorizedException({
//         message: 'Token không đúng định dạng Bearer',
//         code: 'TOKEN_INVALID_FORMAT',
//       });
//     }

//     try {
//       const decoded = checkToken(token);

//       if (!decoded) {
//         throw new UnauthorizedException({
//           message: 'Token không hợp lệ',
//           code: 'TOKEN_INVALID',
//         });
//       }

//       request.user = decoded;

//       return true;
//     } catch (error: any) {
//       if (error?.name === 'TokenExpiredError') {
//         throw new UnauthorizedException({
//           message: 'Token đã hết hạn',
//           code: 'TOKEN_EXPIRED',
//         });
//       }

//       if (error instanceof UnauthorizedException) {
//         throw error;
//       }

//       throw new UnauthorizedException({
//         message: 'Token không hợp lệ',
//         code: 'TOKEN_INVALID',
//       });
//     }
//   }
// }
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { checkToken } from './jwt';

type AccessTokenData = {
  userId: number;
  vaiTroId: number | null;
  email?: string | null;
  fullName?: string | null;
  authType?: string | null;
  permissions?: string[];
};

type AccessTokenPayload = {
  data: AccessTokenData;
  iat?: number;
  exp?: number;
};

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const url = request.originalUrl || request.url || '';

    const publicUrls = [
      '/auth/login',
      '/auth/refresh-token',
      '/swagger',
      '/swagger-json',
    ];

    const isPublicUrl = publicUrls.some((publicUrl) => url.includes(publicUrl));

    if (isPublicUrl) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        message: 'Thiếu token',
        code: 'TOKEN_MISSING',
      });
    }

    const [type, token] = authHeader.trim().split(/\s+/);

    if (type?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({
        message: 'Token không đúng định dạng Bearer',
        code: 'TOKEN_INVALID_FORMAT',
      });
    }

    try {
      const decoded = checkToken(token) as AccessTokenPayload;

      if (!decoded?.data?.userId) {
        throw new UnauthorizedException({
          message: 'Token không hợp lệ',
          code: 'TOKEN_INVALID',
        });
      }

      // Quan trọng: lấy data bên trong token
      request.user = decoded.data;

      return true;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Token đã hết hạn',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        message: 'Token không hợp lệ',
        code: 'TOKEN_INVALID',
      });
    }
  }
}
