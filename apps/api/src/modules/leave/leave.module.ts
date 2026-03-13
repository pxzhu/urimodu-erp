import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditModule } from "../audit/audit.module";
import { DocumentsModule } from "../documents/documents.module";
import { LeaveController } from "./controllers/leave.controller";
import { LeaveService } from "./services/leave.service";

@Module({
  imports: [AuditModule, DocumentsModule, ApprovalsModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService]
})
export class LeaveModule {}
