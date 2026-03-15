import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import type { AuthContext } from "../../../common/auth/request-context";
import { createSessionToken, hashToken } from "../../../common/auth/token.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../audit/services/audit.service";
import type { LoginDto } from "../dto/login.dto";
import { LocalAuthProvider } from "../providers/local-auth.provider";
import { OidcAuthProvider } from "../providers/oidc-auth.provider";
import type { AuthProvider } from "../providers/auth-provider.interface";

@Injectable()
export class AuthService {
  private readonly providers: Map<string, AuthProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(LocalAuthProvider) localAuthProvider: LocalAuthProvider,
    @Inject(OidcAuthProvider) oidcAuthProvider: OidcAuthProvider
  ) {
    this.providers = new Map<string, AuthProvider>();

    for (const provider of [localAuthProvider, oidcAuthProvider]) {
      if (!provider || typeof provider.providerName !== "string" || provider.providerName.length === 0) {
        continue;
      }
      this.providers.set(provider.providerName, provider);
    }
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const providerName = dto.provider ?? "local";
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new UnauthorizedException(`Unsupported auth provider: ${providerName}`);
    }

    const identity = await provider.authenticate({ email: dto.email, password: dto.password });

    if (!identity) {
      await this.auditService.log({
        actorId: null,
        companyId: null,
        entityType: "Auth",
        entityId: dto.email,
        action: "AUTH_LOGIN_FAILED",
        metadataJson: { provider: providerName, email: dto.email },
        ipAddress,
        userAgent
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    const memberships = await this.prisma.companyMembership.findMany({
      where: { userId: identity.userId, active: true },
      include: { company: true }
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException("No active memberships");
    }

    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);

    const session = await this.prisma.userSession.create({
      data: {
        userId: identity.userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    const defaultMembership = memberships[0]!;

    await this.auditService.log({
      actorId: identity.userId,
      companyId: defaultMembership.companyId,
      entityType: "Auth",
      entityId: session.id,
      action: "AUTH_LOGIN_SUCCESS",
      metadataJson: { provider: providerName },
      ipAddress,
      userAgent
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: identity.userId,
        email: identity.email,
        name: identity.name
      },
      memberships: memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: membership.role
      })),
      defaultCompanyId: defaultMembership.companyId
    };
  }

  async logout(auth: AuthContext, ipAddress?: string, userAgent?: string): Promise<{ success: true }> {
    await this.prisma.userSession.delete({ where: { id: auth.sessionId } });

    await this.auditService.log({
      actorId: auth.userId,
      companyId: auth.companyId,
      entityType: "Auth",
      entityId: auth.sessionId,
      action: "AUTH_LOGOUT",
      ipAddress,
      userAgent
    });

    return { success: true };
  }

  async me(auth: AuthContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        memberships: {
          where: { active: true },
          include: { company: true }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      memberships: user.memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: membership.role
      }))
    };
  }
}
