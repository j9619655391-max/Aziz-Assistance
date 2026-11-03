import { IAppRepository } from "../shared/repository/IRepository";
import { LoginSession, RefreshSession, User, RoleName } from "../../types";

export class SessionService {
  private static sessions = new Map<string, LoginSession>();
  private static refreshTokens = new Map<string, RefreshSession>();

  constructor(private repo: IAppRepository) {}

  /**
   * Creates a new authenticated session for a user.
   */
  public async createSession(
    userId: string,
    email: string,
    organizationId: string,
    workspaceIds: string[],
    role: RoleName,
    tenantId: string,
    expiresInSeconds = 3600,
    deviceMetadata?: { ip?: string; userAgent?: string; platform?: string }
  ): Promise<{ session: LoginSession; refreshToken: string }> {
    const sessionId = `sess_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const session: LoginSession = {
      sessionId,
      userId,
      email,
      organizationId,
      workspaceIds,
      role,
      tenantId,
      createdAt,
      expiresAt,
      deviceMetadata,
      revoked: false,
    };

    SessionService.sessions.set(sessionId, session);

    // Generate matching refresh token
    const refreshToken = `ref_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

    const refreshSession: RefreshSession = {
      refreshToken,
      sessionId,
      userId,
      expiresAt: refreshExpiresAt,
      revoked: false,
    };

    SessionService.refreshTokens.set(refreshToken, refreshSession);

    return { session, refreshToken };
  }

  /**
   * Validates a session and returns its active context.
   */
  public async validateSession(sessionId: string): Promise<LoginSession> {
    const session = SessionService.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session does not exist");
    }
    if (session.revoked) {
      throw new Error("Session has been revoked");
    }
    if (new Date() > new Date(session.expiresAt)) {
      throw new Error("Session has expired");
    }
    return session;
  }

  /**
   * Refreshes an expired session using a valid refresh token.
   */
  public async refreshSession(refreshToken: string): Promise<{ session: LoginSession; newRefreshToken: string }> {
    const refresh = SessionService.refreshTokens.get(refreshToken);
    if (!refresh) {
      throw new Error("Invalid refresh token");
    }
    if (refresh.revoked) {
      throw new Error("Refresh token has been revoked");
    }
    if (new Date() > new Date(refresh.expiresAt)) {
      throw new Error("Refresh token has expired");
    }

    // Revoke old session and token
    await this.revokeSession(refresh.sessionId);

    // Get old session details to regenerate (or we fallback to stub details)
    const oldSession = SessionService.sessions.get(refresh.sessionId);
    if (!oldSession) {
      throw new Error("Associated session not found");
    }

    // Create fresh session
    const result = await this.createSession(
      oldSession.userId,
      oldSession.email,
      oldSession.organizationId,
      oldSession.workspaceIds,
      oldSession.role,
      oldSession.tenantId,
      3600,
      oldSession.deviceMetadata
    );

    return {
      session: result.session,
      newRefreshToken: result.refreshToken,
    };
  }

  /**
   * Revokes a session by ID (log out / admin termination).
   */
  public async revokeSession(sessionId: string): Promise<boolean> {
    const session = SessionService.sessions.get(sessionId);
    if (!session) return false;

    session.revoked = true;
    SessionService.sessions.set(sessionId, session);

    // Revoke matching refresh tokens
    for (const ref of SessionService.refreshTokens.values()) {
      if (ref.sessionId === sessionId) {
        ref.revoked = true;
        SessionService.refreshTokens.set(ref.refreshToken, ref);
      }
    }
    return true;
  }

  /**
   * Revokes all active sessions for a user (security wipe).
   */
  public async revokeAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const session of SessionService.sessions.values()) {
      if (session.userId === userId && !session.revoked) {
        session.revoked = true;
        SessionService.sessions.set(session.sessionId, session);
        count++;
      }
    }
    for (const ref of SessionService.refreshTokens.values()) {
      if (ref.userId === userId && !ref.revoked) {
        ref.revoked = true;
        SessionService.refreshTokens.set(ref.refreshToken, ref);
      }
    }
    return count;
  }

  /**
   * Helper to perform high-concurrency stress test simulation.
   */
  public async simulateConcurrentSessions(count: number, tenantId: string): Promise<void> {
    const promises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        this.createSession(
          `user-stress-${i}`,
          `stress-${i}@loadtest.com`,
          "org-1",
          ["ws-1"],
          "Viewer",
          tenantId,
          300,
          { ip: `10.0.0.${i % 255}`, userAgent: "Mozilla/5.0 LoadTester", platform: "Linux" }
        )
      );
    }
    await Promise.all(promises);
  }

  public getActiveSessionsCount(): number {
    return Array.from(SessionService.sessions.values()).filter(
      (s) => !s.revoked && new Date() < new Date(s.expiresAt)
    ).length;
  }

  public clearAllSessions(): void {
    SessionService.sessions.clear();
    SessionService.refreshTokens.clear();
  }
}
