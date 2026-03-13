import { Global, Module } from "@nestjs/common";

import { RolesGuard } from "../guards/roles.guard";
import { SessionAuthGuard } from "../guards/session-auth.guard";

@Global()
@Module({
  providers: [SessionAuthGuard, RolesGuard],
  exports: [SessionAuthGuard, RolesGuard]
})
export class CommonAuthModule {}
