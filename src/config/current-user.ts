import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserData = {
  userId: number;
  vaiTroId: number | null;
  email?: string | null;
  fullName?: string | null;
  authType?: string | null;
  permissions: string[];
};

export const CurrentUser = createParamDecorator(
  (field: keyof CurrentUserData | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    const user = request.user as CurrentUserData;

    return field ? user?.[field] : user;
  },
);
