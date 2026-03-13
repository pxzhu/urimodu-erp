import { maskEmail, maskNationalId, maskPhone } from "../../../common/utils/mask.util";

interface EmployeeLike {
  id: string;
  companyId: string;
  employeeNumber: string;
  nameKr: string;
  nameEn: string | null;
  workEmail: string | null;
  mobilePhone: string | null;
  nationalIdMasked: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentType: string;
  employmentStatus: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  jobTitle?: { id: string; name: string } | null;
}

export function toMaskedEmployee(employee: EmployeeLike) {
  return {
    id: employee.id,
    companyId: employee.companyId,
    employeeNumber: employee.employeeNumber,
    nameKr: employee.nameKr,
    nameEn: employee.nameEn,
    workEmail: maskEmail(employee.workEmail),
    mobilePhone: maskPhone(employee.mobilePhone),
    nationalIdMasked: maskNationalId(employee.nationalIdMasked),
    hireDate: employee.hireDate,
    terminationDate: employee.terminationDate,
    employmentType: employee.employmentType,
    employmentStatus: employee.employmentStatus,
    department: employee.department,
    position: employee.position,
    jobTitle: employee.jobTitle
  };
}
