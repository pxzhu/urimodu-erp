import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EmployeeController } from "./controllers/employee.controller";
import { EmployeeService } from "./services/employee.service";

@Module({
  imports: [AuditModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService]
})
export class EmployeeModule {}
