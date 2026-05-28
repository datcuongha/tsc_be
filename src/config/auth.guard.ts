import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { checkToken } from './jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const url = req.url;

    // 👇 bỏ qua login
    if (url.includes('/auth/login') || url.includes('/auth/refresh-token')) {
      return true;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Thiếu token');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Thiếu token');
    }

    try {
      const decoded = checkToken(token);

      req.user = decoded;
      return true;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Token đã hết hạn',
          code: 'TOKEN_EXPIRED',
        });
      }
    }
  }
}
