import { IAppRepository } from "../shared/repository/IRepository";
import { Workspace, Team } from "../../types";

export class WorkspaceManager {
  private static workspaces = new Map<string, Workspace>([
    [
      "ws-1",
      {
        id: "ws-1",
        name: "Acme Recruitment Workspace",
        organizationId: "org-1",
        tenantId: "tenant-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      "ws-2",
      {
        id: "ws-2",
        name: "Initech Default Workspace",
        organizationId: "org-2",
        tenantId: "tenant-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  private static teams = new Map<string, Team>();

  constructor(private repo: IAppRepository) {}

  public async createWorkspace(id: string, name: string, organizationId: string, tenantId: string): Promise<Workspace> {
    if (WorkspaceManager.workspaces.has(id)) {
      throw new Error(`Workspace with ID ${id} already exists`);
    }
    const ws: Workspace = {
      id,
      name,
      organizationId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    WorkspaceManager.workspaces.set(id, ws);
    return ws;
  }

  public async getWorkspace(id: string, tenantId: string): Promise<Workspace | null> {
    const ws = WorkspaceManager.workspaces.get(id);
    if (!ws) return null;
    if (ws.tenantId !== tenantId) {
      throw new Error(`Cross-tenant workspace access rejected for tenant ${tenantId}`);
    }
    return ws;
  }

  public async listWorkspaces(organizationId: string, tenantId: string): Promise<Workspace[]> {
    return Array.from(WorkspaceManager.workspaces.values()).filter(
      (ws) => ws.organizationId === organizationId && ws.tenantId === tenantId
    );
  }

  // Team Lifecycle Operations
  public async createTeam(id: string, name: string, workspaceId: string, tenantId: string): Promise<Team> {
    const ws = await this.getWorkspace(workspaceId, tenantId);
    if (!ws) {
      throw new Error(`Workspace with ID ${workspaceId} not found or inaccessible in tenant ${tenantId}`);
    }
    const team: Team = {
      id,
      name,
      workspaceId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    WorkspaceManager.teams.set(id, team);
    return team;
  }

  public async listTeams(workspaceId: string, tenantId: string): Promise<Team[]> {
    const ws = await this.getWorkspace(workspaceId, tenantId);
    if (!ws) return [];
    return Array.from(WorkspaceManager.teams.values()).filter(
      (team) => team.workspaceId === workspaceId && team.tenantId === tenantId
    );
  }
}
