import { IAppRepository } from "../shared/repository/IRepository";

export interface Tenant {
  id: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
}

export class TenantManager {
  private static tenants = new Map<string, Tenant>([
    ["tenant-1", { id: "tenant-1", name: "Acme Corp Tenant", status: "active", createdAt: new Date().toISOString() }],
    ["tenant-2", { id: "tenant-2", name: "Initech Tenant", status: "active", createdAt: new Date().toISOString() }]
  ]);

  constructor(private repo: IAppRepository) {}

  public async createTenant(id: string, name: string): Promise<Tenant> {
    if (TenantManager.tenants.has(id)) {
      throw new Error(`Tenant with ID ${id} already exists`);
    }
    const tenant: Tenant = {
      id,
      name,
      status: "active",
      createdAt: new Date().toISOString()
    };
    TenantManager.tenants.set(id, tenant);
    return tenant;
  }

  public async getTenant(id: string): Promise<Tenant | null> {
    return TenantManager.tenants.get(id) || null;
  }

  public async listTenants(): Promise<Tenant[]> {
    return Array.from(TenantManager.tenants.values());
  }

  public async suspendTenant(id: string): Promise<boolean> {
    const tenant = TenantManager.tenants.get(id);
    if (!tenant) return false;
    tenant.status = "suspended";
    TenantManager.tenants.set(id, tenant);
    return true;
  }

  public async validateTenantContext(tenantId: string): Promise<boolean> {
    const tenant = TenantManager.tenants.get(tenantId);
    return tenant !== undefined && tenant.status === "active";
  }
}
