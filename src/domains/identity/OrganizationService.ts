import { IAppRepository } from "../shared/repository/IRepository";
import { Organization } from "../../types";

export class OrganizationService {
  private static organizations = new Map<string, Organization>([
    [
      "org-1",
      {
        id: "org-1",
        name: "Acme Enterprise",
        tenantId: "tenant-1",
        billingPlan: "enterprise",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      "org-2",
      {
        id: "org-2",
        name: "Initech Software",
        tenantId: "tenant-2",
        billingPlan: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  constructor(private repo: IAppRepository) {}

  public async createOrganization(id: string, name: string, tenantId: string, billingPlan = "free"): Promise<Organization> {
    if (OrganizationService.organizations.has(id)) {
      throw new Error(`Organization with ID ${id} already exists`);
    }
    const org: Organization = {
      id,
      name,
      tenantId,
      billingPlan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    OrganizationService.organizations.set(id, org);
    return org;
  }

  public async getOrganization(id: string, tenantId: string): Promise<Organization | null> {
    const org = OrganizationService.organizations.get(id);
    if (!org) return null;
    // Tenant Isolation
    if (org.tenantId !== tenantId) {
      throw new Error(`Cross-tenant data access rejected for tenant ${tenantId}`);
    }
    return org;
  }

  public async listOrganizations(tenantId: string): Promise<Organization[]> {
    return Array.from(OrganizationService.organizations.values()).filter(
      (org) => org.tenantId === tenantId
    );
  }

  public async updateOrganization(id: string, tenantId: string, updates: Partial<Omit<Organization, "id" | "tenantId">>): Promise<Organization> {
    const org = OrganizationService.organizations.get(id);
    if (!org) {
      throw new Error(`Organization with ID ${id} not found`);
    }
    if (org.tenantId !== tenantId) {
      throw new Error(`Cross-tenant update rejected for tenant ${tenantId}`);
    }
    const updated: Organization = {
      ...org,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    OrganizationService.organizations.set(id, updated);
    return updated;
  }

  public async attachBillingPlan(id: string, tenantId: string, billingPlan: string): Promise<Organization> {
    return this.updateOrganization(id, tenantId, { billingPlan });
  }
}
