import { Injectable } from "@nestjs/common";

import type { AuthProvider, AuthProviderIdentity } from "./auth-provider.interface";

@Injectable()
export class OidcAuthProvider implements AuthProvider {
  readonly providerName = "oidc";

  async authenticate(_: { email: string; password: string }): Promise<AuthProviderIdentity | null> {
    // OIDC provider interface is intentionally present for enterprise extension.
    // Phase 1 local auth is implemented; OIDC wiring is added in a later phase.
    return null;
  }
}
