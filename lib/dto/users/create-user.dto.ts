import type { UserRole, UserStatus } from "@prisma/client";

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
}
