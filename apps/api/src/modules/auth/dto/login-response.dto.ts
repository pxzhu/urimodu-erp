import { ApiProperty } from "@nestjs/swagger";

class LoginMembershipDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty({ enum: ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER", "APPROVER", "EMPLOYEE"] })
  role!: string;
}

class LoginUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;

  @ApiProperty({ type: [LoginMembershipDto] })
  memberships!: LoginMembershipDto[];

  @ApiProperty()
  defaultCompanyId!: string;
}
