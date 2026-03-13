import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { MembershipRole } from "@prisma/client";

import type { RequestWithAuth } from "../auth/request-context";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (!request.auth) {
      throw new ForbiddenException("Missing auth context");
    }

    if (!requiredRoles.includes(request.auth.role)) {
      throw new ForbiddenException("Role not allowed");
    }

    return true;
  }
}
