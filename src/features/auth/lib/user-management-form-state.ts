import type { UserRole } from "@/features/auth/lib/rbac";
import type { UserStatus } from "@/database/mongodb/models/user";

export type UserManagementFormState = {
  error?: string;
  success?: string;
  values?: {
    fullName?: string;
    email?: string;
    phone?: string;
    joiningDate?: string;
    managerId?: string;
    techStack?: string[];
    role?: UserRole;
    status?: UserStatus;
    employeeId?: string;
    department?: string;
    designation?: string;
    dateOfBirth?: string;
    address?: string;
    emergencyContact?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankIfscCode?: string;
    panNumber?: string;
  };
};

export const INITIAL_USER_MANAGEMENT_STATE: UserManagementFormState = {};


