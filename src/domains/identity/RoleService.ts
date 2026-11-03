import { IAppRepository } from "../shared/repository/IRepository";
import { Role, RoleName } from "../../types";

export class RoleService {
  private static roles = new Map<string, Role>([
    [
      "super_admin",
      {
        id: "super_admin",
        name: "Super Admin",
        permissions: [
          "Create",
          "Read",
          "Update",
          "Delete",
          "Approve",
          "Review",
          "Export",
          "Manage Users",
          "Manage Organization",
          "Manage Billing",
          "Manage API Keys",
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "org_admin",
      {
        id: "org_admin",
        name: "Organization Admin",
        permissions: [
          "Create",
          "Read",
          "Update",
          "Delete",
          "Approve",
          "Review",
          "Export",
          "Manage Users",
          "Manage Organization",
          "Manage Billing",
          "Manage API Keys",
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "manager",
      {
        id: "manager",
        name: "Manager",
        permissions: ["Create", "Read", "Update", "Approve", "Review", "Export", "Manage Users"],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "recruiter",
      {
        id: "recruiter",
        name: "Recruiter",
        permissions: ["Create", "Read", "Update", "Review", "Export"],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "reviewer",
      {
        id: "reviewer",
        name: "Reviewer",
        permissions: ["Read", "Review"],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "viewer",
      {
        id: "viewer",
        name: "Viewer",
        permissions: ["Read"],
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  constructor(private repo: IAppRepository) {}

  public async getRole(roleName: RoleName, organizationId?: string): Promise<Role | null> {
    // Check built-in roles first
    const cleanName = roleName.toLowerCase().replace(/\s+/g, "_");
    const builtIn = RoleService.roles.get(cleanName);
    if (builtIn) return builtIn;

    // Search custom roles
    for (const r of RoleService.roles.values()) {
      if (r.name === roleName && (!organizationId || r.organizationId === organizationId)) {
        return r;
      }
    }
    return null;
  }

  public async createCustomRole(name: string, permissions: string[], organizationId: string): Promise<Role> {
    const id = `custom_${organizationId}_${name.toLowerCase().replace(/\s+/g, "_")}`;
    if (RoleService.roles.has(id)) {
      throw new Error(`Role with name ${name} already exists for this organization`);
    }

    const role: Role = {
      id,
      name,
      permissions,
      organizationId,
      createdAt: new Date().toISOString(),
    };
    RoleService.roles.set(id, role);
    return role;
  }

  public async updateCustomRole(roleId: string, permissions: string[], organizationId: string): Promise<Role> {
    const role = RoleService.roles.get(roleId);
    if (!role || role.organizationId !== organizationId) {
      throw new Error(`Custom role not found or belongs to another organization`);
    }
    role.permissions = permissions;
    RoleService.roles.set(roleId, role);
    return role;
  }

  public async listRoles(organizationId?: string): Promise<Role[]> {
    return Array.from(RoleService.roles.values()).filter(
      (r) => !r.organizationId || r.organizationId === organizationId
    );
  }
}
