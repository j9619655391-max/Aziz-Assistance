import { IAppRepository } from "../shared/repository/IRepository";
import { User, RoleName } from "../../types";

export class UserService {
  private static users = new Map<string, User>([
    [
      "user-1",
      {
        id: "user-1",
        email: "alice@acme.com",
        name: "Alice Recruiter",
        organizationId: "org-1",
        workspaceIds: ["ws-1"],
        role: "Recruiter",
        tenantId: "tenant-1",
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "user-2",
      {
        id: "user-2",
        email: "bob@initech.com",
        name: "Bob Manager",
        organizationId: "org-2",
        workspaceIds: ["ws-2"],
        role: "Manager",
        tenantId: "tenant-2",
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  constructor(private repo: IAppRepository) {}

  public async createUser(
    id: string,
    email: string,
    name: string,
    organizationId: string,
    workspaceIds: string[],
    role: RoleName,
    tenantId: string
  ): Promise<User> {
    if (UserService.users.has(id)) {
      throw new Error(`User with ID ${id} already exists`);
    }

    const user: User = {
      id,
      email,
      name,
      organizationId,
      workspaceIds,
      role,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    UserService.users.set(id, user);
    return user;
  }

  public async getUser(id: string, tenantId: string): Promise<User | null> {
    const user = UserService.users.get(id);
    if (!user) return null;
    if (user.tenantId !== tenantId) {
      throw new Error(`Cross-tenant user access rejected for tenant ${tenantId}`);
    }
    return user;
  }

  public async listUsers(organizationId: string, tenantId: string): Promise<User[]> {
    return Array.from(UserService.users.values()).filter(
      (u) => u.organizationId === organizationId && u.tenantId === tenantId
    );
  }

  public async updateUserWorkspaces(id: string, workspaceIds: string[], tenantId: string): Promise<User> {
    const user = UserService.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    if (user.tenantId !== tenantId) {
      throw new Error(`Cross-tenant operation rejected`);
    }

    user.workspaceIds = workspaceIds;
    UserService.users.set(id, user);
    return user;
  }

  public async updateUserRole(id: string, role: RoleName, tenantId: string): Promise<User> {
    const user = UserService.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    if (user.tenantId !== tenantId) {
      throw new Error(`Cross-tenant operation rejected`);
    }

    user.role = role;
    UserService.users.set(id, user);
    return user;
  }
}
