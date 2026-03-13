import { AccountType, LeaveUnit, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUnique({ where: { code: "ACME_KR" } });
  if (!company) {
    throw new Error("ACME_KR company is required. Run core seed first.");
  }

  async function upsertTemplate(input: {
    key: string;
    name: string;
    category: string;
    fields: string[];
    htmlTemplate: string;
  }) {
    await prisma.documentTemplate.upsert({
      where: {
        companyId_key_version: {
          companyId: company.id,
          key: input.key,
          version: 1
        }
      },
      update: {
        name: input.name,
        category: input.category,
        schemaJson: { fields: input.fields },
        htmlTemplate: input.htmlTemplate,
        isActive: true
      },
      create: {
        companyId: company.id,
        key: input.key,
        name: input.name,
        category: input.category,
        version: 1,
        schemaJson: { fields: input.fields },
        htmlTemplate: input.htmlTemplate,
        isSystem: false,
        isActive: true
      }
    });
  }

  await upsertTemplate({
    key: "leave-request",
    name: "휴가 신청서",
    category: "hr",
    fields: ["employeeNumber", "employeeName", "leaveType", "startDate", "endDate", "reason"],
    htmlTemplate: [
      "<h1>휴가 신청서</h1>",
      "<p>사번: {{employeeNumber}}</p>",
      "<p>성명: {{employeeName}}</p>",
      "<p>휴가 구분: {{leaveType}}</p>",
      "<p>기간: {{startDate}} ~ {{endDate}}</p>",
      "<p>사유: {{reason}}</p>"
    ].join("")
  });

  await upsertTemplate({
    key: "expense-approval",
    name: "경비 승인 요청서",
    category: "expense",
    fields: ["employeeNumber", "employeeName", "expenseDate", "amount", "vendorName", "description"],
    htmlTemplate: [
      "<h1>경비 승인 요청서</h1>",
      "<p>사번: {{employeeNumber}}</p>",
      "<p>성명: {{employeeName}}</p>",
      "<p>사용일자: {{expenseDate}}</p>",
      "<p>금액: {{amount}}</p>",
      "<p>사용처: {{vendorName}}</p>",
      "<p>사유: {{description}}</p>"
    ].join("")
  });

  await upsertTemplate({
    key: "attendance-correction",
    name: "근태 정정 요청서",
    category: "attendance",
    fields: ["employeeNumber", "workDate", "requestedCheckInAt", "requestedCheckOutAt", "reason"],
    htmlTemplate: [
      "<h1>근태 정정 요청서</h1>",
      "<p>사번: {{employeeNumber}}</p>",
      "<p>근무일: {{workDate}}</p>",
      "<p>출근 정정: {{requestedCheckInAt}}</p>",
      "<p>퇴근 정정: {{requestedCheckOutAt}}</p>",
      "<p>정정 사유: {{reason}}</p>"
    ].join("")
  });

  await upsertTemplate({
    key: "employment-certificate",
    name: "재직증명서",
    category: "hr",
    fields: ["employeeName", "employeeNumber", "departmentName", "positionName", "jobTitleName", "hireDate", "purpose"],
    htmlTemplate: [
      "<h1>재직증명서</h1>",
      "<p>성명: {{employeeName}}</p>",
      "<p>사번: {{employeeNumber}}</p>",
      "<p>부서: {{departmentName}}</p>",
      "<p>직위/직책: {{positionName}} / {{jobTitleName}}</p>",
      "<p>입사일: {{hireDate}}</p>",
      "<p>용도: {{purpose}}</p>"
    ].join("")
  });

  await upsertTemplate({
    key: "overtime-request",
    name: "연장근무 신청서",
    category: "attendance",
    fields: ["employeeNumber", "employeeName", "workDate", "overtimeStartAt", "overtimeEndAt", "workSummary", "reason"],
    htmlTemplate: [
      "<h1>연장근무 신청서</h1>",
      "<p>사번: {{employeeNumber}}</p>",
      "<p>성명: {{employeeName}}</p>",
      "<p>근무일: {{workDate}}</p>",
      "<p>연장 시간: {{overtimeStartAt}} ~ {{overtimeEndAt}}</p>",
      "<p>업무 내용: {{workSummary}}</p>",
      "<p>신청 사유: {{reason}}</p>"
    ].join("")
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

  const shiftPolicy = await prisma.shiftPolicy.findUnique({
    where: {
      companyId_code_version: {
        companyId: company.id,
        code: "DEFAULT_9_TO_6",
        version: 1
      }
    }
  });

  const employees = await prisma.employee.findMany({
    where: {
      companyId: company.id,
      employeeNumber: {
        in: ["10000001", "10000002", "10000003", "10000004"]
      }
    },
    select: {
      id: true,
      employeeNumber: true,
      nameKr: true
    }
  });

  if (shiftPolicy) {
    const assignmentEffectiveFrom = new Date("2026-01-01");
    for (const employee of employees) {
      await prisma.employeeShiftPolicyAssignment.deleteMany({
        where: {
          employeeId: employee.id,
          effectiveFrom: assignmentEffectiveFrom
        }
      });

      await prisma.employeeShiftPolicyAssignment.create({
        data: {
          employeeId: employee.id,
          shiftPolicyId: shiftPolicy.id,
          effectiveFrom: assignmentEffectiveFrom
        }
      });
    }
  }

  for (const employee of employees) {
    await prisma.employeeExternalIdentity.upsert({
      where: {
        provider_externalUserId: {
          provider: "GENERIC",
          externalUserId: `ADT-EMP-${employee.employeeNumber}`
        }
      },
      update: {
        employeeId: employee.id,
        externalName: `${employee.nameKr}-출입단말`
      },
      create: {
        employeeId: employee.id,
        provider: "GENERIC",
        externalUserId: `ADT-EMP-${employee.employeeNumber}`,
        externalName: `${employee.nameKr}-출입단말`,
        metadata: {
          source: "seed",
          note: "Generic ADT/S1-like external identity mapping"
        }
      }
    });
  }

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

  await prisma.vendor.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "VEND-SEOUL-TAXI"
      }
    },
    update: {
      name: "서울택시협동조합",
      registrationNumber: "123-45-67890",
      isActive: true
    },
    create: {
      companyId: company.id,
      code: "VEND-SEOUL-TAXI",
      name: "서울택시협동조합",
      registrationNumber: "123-45-67890",
      isActive: true
    }
  });

  await prisma.costCenter.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "CC-HR"
      }
    },
    update: {
      name: "인사비용센터",
      isActive: true
    },
    create: {
      companyId: company.id,
      code: "CC-HR",
      name: "인사비용센터",
      isActive: true
    }
  });

  await prisma.project.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "PRJ-ERP-2026"
      }
    },
    update: {
      name: "ERP 고도화 2026",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31")
    },
    create: {
      companyId: company.id,
      code: "PRJ-ERP-2026",
      name: "ERP 고도화 2026",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31")
    }
  });

  console.log("Seeded Korean sample templates/policies/attendance mappings/accounts/finance masters.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
