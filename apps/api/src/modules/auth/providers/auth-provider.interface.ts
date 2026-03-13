export interface AuthProviderIdentity {
  userId: string;
  email: string;
  name: string;
}

export interface AuthProvider {
  readonly providerName: string;
  authenticate(input: { email: string; password: string }): Promise<AuthProviderIdentity | null>;
}
