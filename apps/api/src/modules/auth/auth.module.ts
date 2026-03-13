import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./controllers/auth.controller";
import { OidcAuthProvider } from "./providers/oidc-auth.provider";
import { LocalAuthProvider } from "./providers/local-auth.provider";
import { AuthService } from "./services/auth.service";

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, LocalAuthProvider, OidcAuthProvider],
  exports: [AuthService]
})
export class AuthModule {}
