import { Module } from "@nestjs/common";

import { CommonAuthModule } from "./common/auth/auth.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { EmployeeModule } from "./modules/employee/employee.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { FilesModule } from "./modules/files/files.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { ImportExportModule } from "./modules/import-export/import-export.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { LeaveModule } from "./modules/leave/leave.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrgModule } from "./modules/org/org.module";
import { SignaturesModule } from "./modules/signatures/signatures.module";

@Module({
  imports: [
    PrismaModule,
    CommonAuthModule,
    AuthModule,
    OrgModule,
    EmployeeModule,
    FilesModule,
    DocumentsModule,
    ApprovalsModule,
    SignaturesModule,
    AttendanceModule,
    LeaveModule,
    ExpensesModule,
    FinanceModule,
    ImportExportModule,
    IntegrationsModule,
    NotificationsModule,
    AuditModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
