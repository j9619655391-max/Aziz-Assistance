import { Request, Response, NextFunction } from "express";
import { ApiController, ApiMetrics } from "./ApiController";
import { ApiResponseFactory } from "./ApiResponseFactory";

export class IdentityController extends ApiController {

  /**
   * POST /api/v1/auth/login
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const { email, tenantId, organizationId, workspaceIds = [], role = "Org Admin" } = req.body;

      if (!email || !tenantId || !organizationId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing required credentials: email, tenantId, organizationId"], 0));
        return;
      }

      // Pre-register Tenant if not exist
      let tenant = await services.tenantManager.getTenant(tenantId);
      if (!tenant) {
        tenant = await services.tenantManager.createTenant(tenantId, `${tenantId} Company`);
      }

      // Pre-register Org if not exist
      let org;
      try {
        org = await services.organizationService.getOrganization(organizationId, tenantId);
      } catch {}
      if (!org) {
        org = await services.organizationService.createOrganization(organizationId, `${organizationId} Org`, tenantId);
      }

      // Pre-register User if not exist
      let user;
      try {
        user = await services.userService.getUser(email, tenantId);
      } catch {}
      if (!user) {
        user = await services.userService.createUser(
          email,
          email,
          email.split("@")[0],
          organizationId,
          workspaceIds,
          role,
          tenantId
        );
      }

      const { session, refreshToken } = await services.sessionService.createSession(
        user.id,
        user.email,
        user.organizationId,
        user.workspaceIds,
        user.role,
        user.tenantId,
        3600,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );

      // Audit Login
      await services.auditIdentityService.logEvent(
        user.id,
        "Login",
        `User ${email} successfully logged in`,
        tenantId,
        organizationId,
        workspaceIds[0],
        req.ip
      );

      res.json(ApiResponseFactory.createSuccess({ session, refreshToken }, Date.now() - startTime));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * POST /api/v1/auth/logout
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json(ApiResponseFactory.createError(["sessionId is required to logout"], 0));
        return;
      }

      const session = await services.sessionService.validateSession(sessionId).catch(() => null);
      const revoked = await services.sessionService.revokeSession(sessionId);

      if (session) {
        await services.auditIdentityService.logEvent(
          session.userId,
          "Logout",
          `User ${session.email} logged out successfully`,
          session.tenantId,
          session.organizationId,
          session.workspaceIds[0],
          req.ip
        );
      }

      res.json(ApiResponseFactory.createSuccess({ success: revoked }, Date.now() - startTime));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * POST /api/v1/auth/refresh
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    ApiMetrics.activeRequests++;
    ApiMetrics.requestCount++;
    try {
      const services = this.getServices();
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json(ApiResponseFactory.createError(["refreshToken is required"], 0));
        return;
      }

      const result = await services.sessionService.refreshSession(refreshToken);
      res.json(ApiResponseFactory.createSuccess(result, Date.now() - startTime));
    } catch (err: any) {
      ApiMetrics.errorCount++;
      next(err);
    } finally {
      ApiMetrics.activeRequests--;
    }
  };

  /**
   * GET /api/v1/users
   */
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);
      const organizationId = (req.headers["x-organization-id"] as string) || (req.query.organizationId as string);

      if (!tenantId || !organizationId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing Tenant/Organization Context headers (x-tenant-id, x-organization-id)"], 0));
        return;
      }

      const users = await services.userService.listUsers(organizationId, tenantId);
      res.json(ApiResponseFactory.createSuccess(users, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * POST /api/v1/users
   */
  public createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId;
      const { email, name, organizationId, workspaceIds, role } = req.body;

      if (!email || !organizationId || !tenantId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing required fields: email, organizationId, tenantId"], 0));
        return;
      }

      const user = await services.userService.createUser(
        email,
        email,
        name || email.split("@")[0],
        organizationId,
        workspaceIds || [],
        role || "Viewer",
        tenantId
      );

      // Audit User Creation
      await services.auditIdentityService.logEvent(
        "admin",
        "Permission Changes",
        `Created user ${email} with role ${role || "Viewer"}`,
        tenantId,
        organizationId,
        undefined,
        req.ip
      );

      res.status(201).json(ApiResponseFactory.createSuccess(user, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * GET /api/v1/organizations
   */
  public getOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

      if (!tenantId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing Tenant Context header (x-tenant-id)"], 0));
        return;
      }

      const orgs = await services.organizationService.listOrganizations(tenantId);
      res.json(ApiResponseFactory.createSuccess(orgs, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * POST /api/v1/organizations
   */
  public createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId;
      const { id, name, billingPlan } = req.body;

      if (!id || !name || !tenantId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing required fields: id, name, tenantId"], 0));
        return;
      }

      const org = await services.organizationService.createOrganization(id, name, tenantId, billingPlan);

      // Audit Org Creation
      await services.auditIdentityService.logEvent(
        "admin",
        "Organization Changes",
        `Created organization ${name}`,
        tenantId,
        id,
        undefined,
        req.ip
      );

      res.status(201).json(ApiResponseFactory.createSuccess(org, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * GET /api/v1/workspaces
   */
  public getWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);
      const organizationId = (req.headers["x-organization-id"] as string) || (req.query.organizationId as string);

      if (!tenantId || !organizationId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing Tenant/Organization Context headers (x-tenant-id, x-organization-id)"], 0));
        return;
      }

      const workspaces = await services.workspaceManager.listWorkspaces(organizationId, tenantId);
      res.json(ApiResponseFactory.createSuccess(workspaces, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * POST /api/v1/workspaces
   */
  public createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId;
      const { id, name, organizationId } = req.body;

      if (!id || !name || !organizationId || !tenantId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing required fields: id, name, organizationId, tenantId"], 0));
        return;
      }

      const ws = await services.workspaceManager.createWorkspace(id, name, organizationId, tenantId);

      // Audit Workspace Creation
      await services.auditIdentityService.logEvent(
        "admin",
        "Workspace Changes",
        `Created workspace ${name} under organization ${organizationId}`,
        tenantId,
        organizationId,
        id,
        req.ip
      );

      res.status(201).json(ApiResponseFactory.createSuccess(ws, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * GET /api/v1/roles
   */
  public getRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const organizationId = req.query.organizationId as string;
      const roles = await services.roleService.listRoles(organizationId);
      res.json(ApiResponseFactory.createSuccess(roles, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * POST /api/v1/roles
   */
  public createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const services = this.getServices();
      const { name, permissions, organizationId } = req.body;

      if (!name || !permissions || !organizationId) {
        res.status(400).json(ApiResponseFactory.createError(["Missing required fields: name, permissions, organizationId"], 0));
        return;
      }

      const role = await services.roleService.createCustomRole(name, permissions, organizationId);

      // Audit Role Creation
      await services.auditIdentityService.logEvent(
        "admin",
        "Role Changes",
        `Created custom role ${name} with permissions [${permissions.join(", ")}]`,
        "system",
        organizationId,
        undefined,
        req.ip
      );

      res.status(201).json(ApiResponseFactory.createSuccess(role, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };

  /**
   * GET /api/v1/permissions
   */
  public getPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      const permissions = [
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
      ];
      res.json(ApiResponseFactory.createSuccess(permissions, Date.now() - startTime));
    } catch (err: any) {
      next(err);
    }
  };
}
