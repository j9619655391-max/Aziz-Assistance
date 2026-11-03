import { RoleService } from "./RoleService";
import { User, RoleName } from "../../types";

export class PermissionService {
  constructor(private roleService: RoleService) {}

  /**
   * Evaluates if a given role name supports the requested permission.
   */
  public async hasPermission(roleName: RoleName, permission: string, organizationId?: string): Promise<boolean> {
    const role = await this.roleService.getRole(roleName, organizationId);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  /**
   * Enforces permission rules on user object.
   */
  public async checkUserPermission(user: User, permission: string): Promise<boolean> {
    // 1. Check primary role
    let allowed = await this.hasPermission(user.role, permission, user.organizationId);
    if (allowed) return true;

    // 2. Check custom/secondary roles
    if (user.customRoles && user.customRoles.length > 0) {
      for (const customRole of user.customRoles) {
        if (await this.hasPermission(customRole, permission, user.organizationId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Enforces exact tenant, organization, and optional workspace isolation.
   */
  public validateIsolation(
    user: User,
    context: { tenantId: string; organizationId: string; workspaceId?: string }
  ): boolean {
    // Tenant Isolation
    if (user.tenantId !== context.tenantId) {
      return false;
    }

    // Organization Isolation
    if (user.organizationId !== context.organizationId) {
      return false;
    }

    // Workspace Isolation (if workspace context is specified)
    if (context.workspaceId && !user.workspaceIds.includes(context.workspaceId)) {
      return false;
    }

    return true;
  }
}
