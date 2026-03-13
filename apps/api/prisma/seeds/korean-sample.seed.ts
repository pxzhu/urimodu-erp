import { AccountType, LeaveUnit, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUnique({ where: { code: "ACME_KR" } });
  if (!company) {
    throw new Error("ACME_KR company is required. Run core seed first.");
  }

  await prisma.documentTemplate.upsert({
    where: {
      companyId_key_version: {
        companyId: company.id,
        key: "leave-request",
        version: 1
      }
    },
    update: {
      name: "휴가신청서"
    },
    create: {
      companyId: company.id,
      key: "leave-request",
      name: "휴가신청서",
      category: "hr",
      version: 1,
      schemaJson: {
        fields: ["employeeNumber", "startDate", "endDate", "reason"]
      },
      htmlTemplate: "<h1>휴가신청서</h1><p>사유: {{reason}}</p>"
    }
  });

  await prisma.documentTemplate.upsert({
    where: {
      companyId_key_version: {
        companyId: company.id,
        key: "attendance-correction",
        version: 1
      }
    },
    update: {
      name: "근태정정요청서"
    },
    create: {
      companyId: company.id,
      key: "attendance-correction",
      name: "근태정정요청서",
      category: "attendance",
      version: 1,
      schemaJson: {
        fields: ["employeeNumber", "workDate", "requestedCheckInAt", "requestedCheckOutAt", "reason"]
      },
      htmlTemplate: "<h1>근태정정요청서</h1><p>정정 사유: {{reason}}</p>"
    }
  });

  await prisma.documentTemplate.upsert({
    where: {
      companyId_key_version: {
        companyId: company.id,
        key: "expense-claim",
        version: 1
      }
    },
    update: {
      name: "경비청구서"
    },
    create: {
      companyId: company.id,
      key: "expense-claim",
      name: "경비청구서",
      category: "expense",
      version: 1,
      schemaJson: {
        fields: ["employeeNumber", "expenseDate", "amount", "description"]
      },
      htmlTemplate: "<h1>경비청구서</h1><p>금액: {{amount}}</p>"
    }
  });

  await prisma.shiftPolicy.upsert({
    where: {
      companyId_code_version: {
        companyId: company.id,
        code: "DEFAULT_9_TO_6",
        version: 1
      }
    },
    update: {
      name: "기본 09:00~18:00",
      graceMinutes: 10
    },
    create: {
      companyId: company.id,
      code: "DEFAULT_9_TO_6",
      name: "기본 09:00~18:00",
      version: 1,
      timezone: "Asia/Seoul",
      workStartMinutes: 540,
      workEndMinutes: 1080,
      breakMinutes: 60,
      graceMinutes: 10,
      isDefault: true
    }
  });

  await prisma.leavePolicy.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "ANNUAL"
      }
    },
    update: {
      name: "연차",
      unit: LeaveUnit.DAY,
      annualAllocationDays: 15
    },
    create: {
      companyId: company.id,
      code: "ANNUAL",
      name: "연차",
      unit: LeaveUnit.DAY,
      annualAllocationDays: 15,
      maxCarryoverDays: 5,
      isPaid: true
    }
  });

  await prisma.leavePolicy.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "HALF_AM"
      }
    },
    update: {
      name: "반차 오전",
      unit: LeaveUnit.HALF_DAY_AM
    },
    create: {
      companyId: company.id,
      code: "HALF_AM",
      name: "반차 오전",
      unit: LeaveUnit.HALF_DAY_AM,
      isPaid: true
    }
  });

  await prisma.leavePolicy.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "HALF_PM"
      }
    },
    update: {
      name: "반차 오후",
      unit: LeaveUnit.HALF_DAY_PM
    },
    create: {
      companyId: company.id,
      code: "HALF_PM",
      name: "반차 오후",
      unit: LeaveUnit.HALF_DAY_PM,
      isPaid: true
    }
  });

  await prisma.leavePolicy.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "HOURLY"
      }
    },
    update: {
      name: "시간차",
      unit: LeaveUnit.HOUR
    },
    create: {
      companyId: company.id,
      code: "HOURLY",
      name: "시간차",
      unit: LeaveUnit.HOUR,
      isPaid: true
    }
  });

  const accounts = [
    ["1100", "현금및현금성자산", AccountType.ASSET],
    ["1200", "매출채권", AccountType.ASSET],
    ["2100", "매입채무", AccountType.LIABILITY],
    ["3100", "자본금", AccountType.EQUITY],
    ["4100", "매출", AccountType.REVENUE],
    ["5100", "급여", AccountType.EXPENSE],
    ["5200", "복리후생비", AccountType.EXPENSE],
    ["5300", "여비교통비", AccountType.EXPENSE],
    ["5400", "소모품비", AccountType.EXPENSE]
  ] as const;

  for (const [code, name, type] of accounts) {
    await prisma.account.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code
        }
      },
      update: {
        name,
        type
      },
      create: {
        companyId: company.id,
        code,
        name,
        type
      }
    });
  }

  console.log("Seeded Korean sample templates/policies/accounts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
