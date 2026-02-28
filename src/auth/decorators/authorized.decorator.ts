import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

export const Authorized = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = ctx.switchToHttp().getRequest() as Request;

    const user = request.user;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data ? user![data] : user;
  },
);
