import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { ProfileService } from "./ProfileService";

export class IdentityModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "identity",
    name: "Identity Module",
    version: "1.0.0",
    description: "User profile management, Job profile metadata, and freelancing pitch portfolio configurations.",
    author: "Identity & Profile Domain",
    capabilities: ["PROFILE_MANAGEMENT", "IDENTITY_SERVICE"],
    dependencies: ["repository"],
    requiredServices: [
      "ProfileService",
      "TenantManager",
      "OrganizationService",
      "WorkspaceManager",
      "UserService",
      "RoleService",
      "PermissionService",
      "SessionService",
      "AuditIdentityService",
    ],
  };

  private profileService: ProfileService | null = null;
  private tenantManager: any = null;
  private organizationService: any = null;
  private workspaceManager: any = null;
  private userService: any = null;
  private roleService: any = null;
  private permissionService: any = null;
  private sessionService: any = null;
  private auditIdentityService: any = null;

  protected async startup(registry: any): Promise<void> {
    this.profileService = registry.profileService;
    this.tenantManager = registry.tenantManager;
    this.organizationService = registry.organizationService;
    this.workspaceManager = registry.workspaceManager;
    this.userService = registry.userService;
    this.roleService = registry.roleService;
    this.permissionService = registry.permissionService;
    this.sessionService = registry.sessionService;
    this.auditIdentityService = registry.auditIdentityService;

    if (!this.profileService) {
      throw new Error("Required dependency 'profileService' not available in service registry");
    }
    if (!this.tenantManager) {
      throw new Error("Required dependency 'tenantManager' not available in service registry");
    }
  }

  protected async diagnostics() {
    const jobProfile = this.profileService ? await this.profileService.getJobProfile() : null;
    return {
      hasJobProfile: !!jobProfile,
      jobProfileSkillsCount: jobProfile?.skills?.length || 0,
    };
  }
}
