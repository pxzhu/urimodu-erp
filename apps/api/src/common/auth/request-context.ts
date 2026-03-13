import type { MembershipRole } from "@prisma/client";

export interface AuthMembership {
  companyId: string;
  role: MembershipRole;
  companyName: string;
}

export interface AuthContext {
  userId: string;
  sessionId: string;
  companyId: string;
  role: MembershipRole;
  memberships: AuthMembership[];
  token: string;
}

export interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  auth?: AuthContext;
}
