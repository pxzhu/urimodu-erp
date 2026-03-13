import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ExpensesController } from "./controllers/expenses.controller";
import { ExpensesService } from "./services/expenses.service";

@Module({
  imports: [AuditModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService]
})
export class ExpensesModule {}
