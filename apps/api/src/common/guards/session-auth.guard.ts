import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import type { RequestWithAuth } from "../auth/request-context";
import { hashToken } from "../auth/token.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authHeaderValue = request.headers.authorization;
    const authHeader = typeof authHeaderValue === "string" ? authHeaderValue : authHeaderValue?.[0];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const tokenHash = hashToken(token);
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: { active: true },
              include: { company: true }
            }
          }
        }
      }
    });

    if (!session) {
      throw new UnauthorizedException("Invalid session");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new UnauthorizedException("Session expired");
    }

    const memberships = session.user.memberships.map((membership) => ({
      companyId: membership.companyId,
      role: membership.role,
      companyName: membership.company.name
    }));

    if (memberships.length === 0) {
      throw new UnauthorizedException("No active company membership");
    }

    const requestedCompanyIdHeader = request.headers["x-company-id"];
    const requestedCompanyId =
      typeof requestedCompanyIdHeader === "string" ? requestedCompanyIdHeader : memberships[0]!.companyId;

    const selectedMembership = memberships.find((membership) => membership.companyId === requestedCompanyId);

    if (!selectedMembership) {
      throw new UnauthorizedException("Company access denied");
    }

    request.auth = {
      userId: session.userId,
      sessionId: session.id,
      companyId: selectedMembership.companyId,
      role: selectedMembership.role,
      memberships,
      token
    };

    return true;
  }
}
