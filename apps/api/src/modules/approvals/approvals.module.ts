import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ApprovalsController } from "./controllers/approvals.controller";
import { ApprovalsService } from "./services/approvals.service";

@Module({
  imports: [AuditModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
