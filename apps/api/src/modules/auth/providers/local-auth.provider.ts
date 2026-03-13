import { Injectable } from "@nestjs/common";

import { verifyPassword } from "../../../common/auth/password.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { AuthProvider, AuthProviderIdentity } from "./auth-provider.interface";

@Injectable()
export class LocalAuthProvider implements AuthProvider {
  readonly providerName = "local";

  constructor(private readonly prisma: PrismaService) {}

  async authenticate(input: { email: string; password: string }): Promise<AuthProviderIdentity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { credentials: true }
    });

    if (!user?.credentials) {
      return null;
    }

    if (!verifyPassword(input.password, user.credentials.passwordHash)) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name
    };
  }
}
