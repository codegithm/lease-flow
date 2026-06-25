/**
 * Role definitions - mirrors the backend RoleType enum and Roles table.
 * This is the single source of truth for role-related logic in the frontend.
 */

/**
 * Role enum - matches the database Roles table IDs
 */
export enum RoleType {
  Tenant = 1,
  Agent = 2,
  PropertyManager = 3,
  Owner = 4,
  Landlord = 5,
  Admin = 6,
}

/**
 * Role name constants - matches the database role name strings
 */
export const RoleName = {
  TENANT: "tenant",
  AGENT: "agent",
  PROPERTY_MANAGER: "property_manager",
  OWNER: "owner",
  LANDLORD: "landlord",
  ADMIN: "admin",
} as const;

export type RoleNameType = (typeof RoleName)[keyof typeof RoleName];

/**
 * All available roles in the system
 */
export const ALL_ROLES: RoleNameType[] = [
  RoleName.TENANT,
  RoleName.AGENT,
  RoleName.PROPERTY_MANAGER,
  RoleName.OWNER,
  RoleName.LANDLORD,
  RoleName.ADMIN,
];

/**
 * Role display names for UI
 */
export const RoleDisplayName: Record<RoleNameType, string> = {
  [RoleName.TENANT]: "Tenant",
  [RoleName.AGENT]: "Agent",
  [RoleName.PROPERTY_MANAGER]: "Property Manager",
  [RoleName.OWNER]: "Owner",
  [RoleName.LANDLORD]: "Landlord",
  [RoleName.ADMIN]: "Admin",
};

/**
 * Roles that can create new companies during registration
 */
export const COMPANY_CREATOR_ROLES: RoleNameType[] = [
  RoleName.OWNER,
  RoleName.LANDLORD,
  RoleName.PROPERTY_MANAGER,
  RoleName.ADMIN,
];

/**
 * Roles that can manage users/team members
 */
export const USER_MANAGEMENT_ROLES: RoleNameType[] = [
  RoleName.OWNER,
  RoleName.LANDLORD,
  RoleName.PROPERTY_MANAGER,
  RoleName.ADMIN,
];

/**
 * Roles that can access the configurations/permissions page
 */
export const CONFIG_ACCESS_ROLES: RoleNameType[] = [
  RoleName.OWNER,
  RoleName.LANDLORD,
  RoleName.ADMIN,
];

/**
 * Roles that are considered "staff" (not tenants)
 */
export const STAFF_ROLES: RoleNameType[] = [
  RoleName.AGENT,
  RoleName.PROPERTY_MANAGER,
  RoleName.OWNER,
  RoleName.LANDLORD,
  RoleName.ADMIN,
];

/**
 * Helper class for role-related operations
 */
export const RoleHelper = {
  /**
   * Checks if a role can create new companies
   */
  canCreateCompany(role: string | undefined | null): boolean {
    if (!role) return false;
    return COMPANY_CREATOR_ROLES.includes(role.toLowerCase() as RoleNameType);
  },

  /**
   * Checks if a role can manage users in the company
   */
  canManageUsers(role: string | undefined | null): boolean {
    if (!role) return false;
    return USER_MANAGEMENT_ROLES.includes(role.toLowerCase() as RoleNameType);
  },

  /**
   * Checks if a role can access the configurations page
   */
  canAccessConfig(role: string | undefined | null): boolean {
    if (!role) return false;
    return CONFIG_ACCESS_ROLES.includes(role.toLowerCase() as RoleNameType);
  },

  /**
   * Checks if a role is a staff/management role (not tenant)
   */
  isStaff(role: string | undefined | null): boolean {
    if (!role) return false;
    return STAFF_ROLES.includes(role.toLowerCase() as RoleNameType);
  },

  /**
   * Checks if role is a tenant
   */
  isTenant(role: string | undefined | null): boolean {
    if (!role) return false;
    return role.toLowerCase() === RoleName.TENANT;
  },

  /**
   * Checks if role is an owner
   */
  isOwner(role: string | undefined | null): boolean {
    if (!role) return false;
    return role.toLowerCase() === RoleName.OWNER;
  },

  /**
   * Checks if role is an admin
   */
  isAdmin(role: string | undefined | null): boolean {
    if (!role) return false;
    return role.toLowerCase() === RoleName.ADMIN;
  },

  /**
   * Checks if role is a landlord
   */
  isLandlord(role: string | undefined | null): boolean {
    if (!role) return false;
    return role.toLowerCase() === RoleName.LANDLORD;
  },

  /**
   * Gets the display name for a role
   */
  getDisplayName(role: string | undefined | null): string {
    if (!role) return "Unknown";
    const normalizedRole = role.toLowerCase() as RoleNameType;
    return RoleDisplayName[normalizedRole] || role;
  },

  /**
   * Parses a string role to normalized lowercase format
   */
  parseRole(role: string | undefined | null): RoleNameType | null {
    if (!role) return null;
    const normalized = role.toLowerCase();
    if (ALL_ROLES.includes(normalized as RoleNameType)) {
      return normalized as RoleNameType;
    }
    return null;
  },

  /**
   * Checks if the current user can modify the target user's permissions
   */
  canModifyUserPermissions(
    currentUserRole: string | undefined | null,
    targetUserRole: string | undefined | null,
    isSameUser: boolean
  ): boolean {
    if (isSameUser) return false;
    if (!currentUserRole || !targetUserRole) return false;

    const myRole = currentUserRole.toLowerCase();
    const targetRole = targetUserRole.toLowerCase();

    // Owners can modify anyone except other owners
    if (myRole === RoleName.OWNER) {
      return targetRole !== RoleName.OWNER;
    }

    // Landlords can modify non-owner, non-landlord, non-admin
    if (myRole === RoleName.LANDLORD) {
      return (
        targetRole !== RoleName.OWNER &&
        targetRole !== RoleName.LANDLORD &&
        targetRole !== RoleName.ADMIN
      );
    }

    // Admins can modify non-owner, non-landlord, non-admin
    if (myRole === RoleName.ADMIN) {
      return (
        targetRole !== RoleName.OWNER &&
        targetRole !== RoleName.LANDLORD &&
        targetRole !== RoleName.ADMIN
      );
    }

    return false;
  },
};

export default RoleHelper;
