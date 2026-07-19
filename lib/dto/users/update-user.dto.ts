import type { UserRole, UserStatus } from "@prisma/client";

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  currentToken?: string | null;
  salt?: string;
}
