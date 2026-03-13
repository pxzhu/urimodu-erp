import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { AuthContext, RequestWithAuth } from "../auth/request-context";

export const CurrentAuth = createParamDecorator((_: unknown, context: ExecutionContext): AuthContext => {
  const request = context.switchToHttp().getRequest<RequestWithAuth>();
  if (!request.auth) {
    throw new Error("Auth context is not available");
  }

  return request.auth;
});
