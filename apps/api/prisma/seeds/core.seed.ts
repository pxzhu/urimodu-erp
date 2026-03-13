import {
  EmploymentType,
  MembershipRole,
  PrismaClient,
  UserStatus
} from "@prisma/client";

import { hashPassword } from "../../src/common/auth/password.util";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe123!";

async function upsertUser(input: {
  email: string;
  name: string;
  locale?: string;
  role: MembershipRole;
  companyId: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      locale: input.locale ?? "ko-KR",
      status: UserStatus.ACTIVE
    },
    create: {
      email: input.email,
      name: input.name,
      locale: input.locale ?? "ko-KR",
      status: UserStatus.ACTIVE
    }
  });

  await prisma.passwordCredential.upsert({
    where: { userId: user.id },
    update: {
      passwordHash: hashPassword(DEFAULT_PASSWORD)
    },
    create: {
      userId: user.id,
      passwordHash: hashPassword(DEFAULT_PASSWORD)
    }
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userId: {
        companyId: input.companyId,
        userId: user.id
      }
    },
    update: {
      role: input.role,
      active: true
    },
    create: {
      companyId: input.companyId,
      userId: user.id,
      role: input.role,
      active: true
    }
  });

  return user;
}

async function main() {
  const company = await prisma.company.upsert({
    where: { code: "ACME_KR" },
    update: {
      name: "Acme Korea",
      defaultLocale: "ko-KR",
      timezone: "Asia/Seoul"
    },
    create: {
      code: "ACME_KR",
      name: "Acme Korea",
      defaultLocale: "ko-KR",
      timezone: "Asia/Seoul"
    }
  });

  const legalEntity = await prisma.legalEntity.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "ACME-KR-LE1"
      }
    },
    update: {
      name: "주식회사 에이씨미코리아",
      registrationNumber: "110111-1234567",
      representativeName: "홍대표"
    },
    create: {
      companyId: company.id,
      code: "ACME-KR-LE1",
      name: "주식회사 에이씨미코리아",
      registrationNumber: "110111-1234567",
      representativeName: "홍대표"
    }
  });

  const seoulHq = await prisma.businessSite.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "SEOUL-HQ"
      }
    },
    update: {
      name: "서울 본사",
      legalEntityId: legalEntity.id,
      address: "서울특별시 강남구 테헤란로 100"
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      code: "SEOUL-HQ",
      name: "서울 본사",
      address: "서울특별시 강남구 테헤란로 100",
      timezone: "Asia/Seoul"
    }
  });

  await prisma.businessSite.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "BUSAN-OPS"
      }
    },
    update: {
      name: "부산 운영센터",
      legalEntityId: legalEntity.id,
      address: "부산광역시 해운대구 센텀중앙로 50"
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      code: "BUSAN-OPS",
      name: "부산 운영센터",
      address: "부산광역시 해운대구 센텀중앙로 50",
      timezone: "Asia/Seoul"
    }
  });

  const [hr, fin, eng, ops, sales] = await Promise.all([
    prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: "HR" } },
      update: { name: "인사팀", businessSiteId: seoulHq.id },
      create: { companyId: company.id, code: "HR", name: "인사팀", businessSiteId: seoulHq.id }
    }),
    prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: "FIN" } },
      update: { name: "재무회계팀", businessSiteId: seoulHq.id },
      create: { companyId: company.id, code: "FIN", name: "재무회계팀", businessSiteId: seoulHq.id }
    }),
    prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: "ENG" } },
      update: { name: "개발팀", businessSiteId: seoulHq.id },
      create: { companyId: company.id, code: "ENG", name: "개발팀", businessSiteId: seoulHq.id }
    }),
    prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: "OPS" } },
      update: { name: "운영팀", businessSiteId: seoulHq.id },
      create: { companyId: company.id, code: "OPS", name: "운영팀", businessSiteId: seoulHq.id }
    }),
    prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: "SALES" } },
      update: { name: "영업팀", businessSiteId: seoulHq.id },
      create: { companyId: company.id, code: "SALES", name: "영업팀", businessSiteId: seoulHq.id }
    })
  ]);

  const positions = await Promise.all([
    prisma.position.upsert({
      where: { companyId_code: { companyId: company.id, code: "STAFF" } },
      update: { name: "사원" },
      create: { companyId: company.id, code: "STAFF", name: "사원" }
    }),
    prisma.position.upsert({
      where: { companyId_code: { companyId: company.id, code: "ASSISTANT_MANAGER" } },
      update: { name: "대리" },
      create: { companyId: company.id, code: "ASSISTANT_MANAGER", name: "대리" }
    }),
    prisma.position.upsert({
      where: { companyId_code: { companyId: company.id, code: "MANAGER" } },
      update: { name: "과장" },
      create: { companyId: company.id, code: "MANAGER", name: "과장" }
    }),
    prisma.position.upsert({
      where: { companyId_code: { companyId: company.id, code: "SENIOR_MANAGER" } },
      update: { name: "차장" },
      create: { companyId: company.id, code: "SENIOR_MANAGER", name: "차장" }
    }),
    prisma.position.upsert({
      where: { companyId_code: { companyId: company.id, code: "DIRECTOR" } },
      update: { name: "부장" },
      create: { companyId: company.id, code: "DIRECTOR", name: "부장" }
    })
  ]);

  const jobTitles = await Promise.all([
    prisma.jobTitle.upsert({
      where: { companyId_code: { companyId: company.id, code: "MEMBER" } },
      update: { name: "팀원" },
      create: { companyId: company.id, code: "MEMBER", name: "팀원" }
    }),
    prisma.jobTitle.upsert({
      where: { companyId_code: { companyId: company.id, code: "PART_LEAD" } },
      update: { name: "파트리드" },
      create: { companyId: company.id, code: "PART_LEAD", name: "파트리드" }
    }),
    prisma.jobTitle.upsert({
      where: { companyId_code: { companyId: company.id, code: "TEAM_LEAD" } },
      update: { name: "팀장" },
      create: { companyId: company.id, code: "TEAM_LEAD", name: "팀장" }
    }),
    prisma.jobTitle.upsert({
      where: { companyId_code: { companyId: company.id, code: "HEAD" } },
      update: { name: "실장" },
      create: { companyId: company.id, code: "HEAD", name: "실장" }
    })
  ]);

  const adminUser = await upsertUser({
    email: "admin@acme.local",
    name: "관리자",
    role: MembershipRole.SUPER_ADMIN,
    companyId: company.id
  });

  const hrUser = await upsertUser({
    email: "hr@acme.local",
    name: "인사담당자",
    role: MembershipRole.HR_MANAGER,
    companyId: company.id
  });

  const managerUser = await upsertUser({
    email: "manager@acme.local",
    name: "결재자",
    role: MembershipRole.APPROVER,
    companyId: company.id
  });

  const employeeUser = await upsertUser({
    email: "employee@acme.local",
    name: "일반직원",
    role: MembershipRole.EMPLOYEE,
    companyId: company.id
  });

  const [staffPosition, managerPosition] = [positions[0], positions[2]];
  const [memberTitle, teamLeadTitle] = [jobTitles[0], jobTitles[2]];

  const adminEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeNumber: {
        companyId: company.id,
        employeeNumber: "10000001"
      }
    },
    update: {
      nameKr: "관리자",
      workEmail: "admin@acme.local",
      departmentId: hr.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      positionId: managerPosition.id,
      jobTitleId: teamLeadTitle.id,
      userId: adminUser.id
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      departmentId: hr.id,
      userId: adminUser.id,
      positionId: managerPosition.id,
      jobTitleId: teamLeadTitle.id,
      employeeNumber: "10000001",
      nameKr: "관리자",
      workEmail: "admin@acme.local",
      hireDate: new Date("2024-01-01"),
      employmentType: EmploymentType.FULL_TIME
    }
  });

  const hrEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeNumber: {
        companyId: company.id,
        employeeNumber: "10000002"
      }
    },
    update: {
      nameKr: "인사담당자",
      workEmail: "hr@acme.local",
      departmentId: hr.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      positionId: managerPosition.id,
      jobTitleId: memberTitle.id,
      managerId: adminEmployee.id,
      userId: hrUser.id
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      departmentId: hr.id,
      userId: hrUser.id,
      positionId: managerPosition.id,
      jobTitleId: memberTitle.id,
      managerId: adminEmployee.id,
      employeeNumber: "10000002",
      nameKr: "인사담당자",
      workEmail: "hr@acme.local",
      hireDate: new Date("2024-01-02"),
      employmentType: EmploymentType.FULL_TIME
    }
  });

  await prisma.employee.upsert({
    where: {
      companyId_employeeNumber: {
        companyId: company.id,
        employeeNumber: "10000003"
      }
    },
    update: {
      nameKr: "결재자",
      workEmail: "manager@acme.local",
      departmentId: eng.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      positionId: managerPosition.id,
      jobTitleId: teamLeadTitle.id,
      managerId: adminEmployee.id,
      userId: managerUser.id
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      departmentId: eng.id,
      userId: managerUser.id,
      positionId: managerPosition.id,
      jobTitleId: teamLeadTitle.id,
      managerId: adminEmployee.id,
      employeeNumber: "10000003",
      nameKr: "결재자",
      workEmail: "manager@acme.local",
      hireDate: new Date("2024-01-03"),
      employmentType: EmploymentType.FULL_TIME
    }
  });

  await prisma.employee.upsert({
    where: {
      companyId_employeeNumber: {
        companyId: company.id,
        employeeNumber: "10000004"
      }
    },
    update: {
      nameKr: "일반직원",
      workEmail: "employee@acme.local",
      departmentId: ops.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      positionId: staffPosition.id,
      jobTitleId: memberTitle.id,
      managerId: hrEmployee.id,
      userId: employeeUser.id
    },
    create: {
      companyId: company.id,
      legalEntityId: legalEntity.id,
      businessSiteId: seoulHq.id,
      departmentId: ops.id,
      userId: employeeUser.id,
      positionId: staffPosition.id,
      jobTitleId: memberTitle.id,
      managerId: hrEmployee.id,
      employeeNumber: "10000004",
      nameKr: "일반직원",
      workEmail: "employee@acme.local",
      hireDate: new Date("2024-01-04"),
      employmentType: EmploymentType.FULL_TIME
    }
  });

  console.log("Seeded core auth/org/employee entities.");
  console.log("Default login password is configured via SEED_DEFAULT_PASSWORD.");
  console.log(`Departments: ${[hr.name, fin.name, eng.name, ops.name, sales.name].join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
