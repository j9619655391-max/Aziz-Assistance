/**
 * @file /src/kernel/tests/IdentityPlatform.test.ts
 * @description Unit and Integration tests for multi-tenant Identity Platform components.
 */

import { ServiceRegistry } from "../../services/backend/ServiceRegistry";
import { providerManager } from "../provider";
import { User, RoleName, LoginSession } from "../../types";

class TestSuite {
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public report(): void {
    console.log(`===========================================`);
    console.log(`Identity Platform Unit Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===========================================`);
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const assert = {
  equal: <T>(actual: T, expected: T, msg?: string) => {
    if (actual !== expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
  },
  ok: (val: any, msg?: string) => {
    if (!val) {
      throw new Error(`${msg || "Assertion failed"}: value was not truthy`);
    }
  },
  throws: async (fn: () => any | Promise<any>, expectedErrorMsg?: string, msg?: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (expectedErrorMsg && !err.message.includes(expectedErrorMsg)) {
        throw new Error(`${msg || "Throws assertion failed"}: expected error to contain "${expectedErrorMsg}", but got "${err.message}"`);
      }
      return;
    }
    throw new Error(`${msg || "Throws assertion failed"}: expected block to throw an error, but it succeeded`);
  },
};

async function runIdentityPlatformTests(): Promise<void> {
  console.log("=================================================================");
  console.log("              AZIZ IDENTITY PLATFORM UNIT TESTS                  ");
  console.log("=================================================================");

  const suite = new TestSuite();
  const services = new ServiceRegistry(providerManager);

  // Clean previous states before test starts
  services.sessionService.clearAllSessions();
  services.auditIdentityService.clearLogs();

  // Pre-seed some tenants & organizations
  await services.tenantManager.createTenant("tenant-a", "Tenant Alpha");
  await services.tenantManager.createTenant("tenant-b", "Tenant Beta");

  await services.organizationService.createOrganization("org-a", "Org Alpha", "tenant-a", "growth");
  await services.organizationService.createOrganization("org-b", "Org Beta", "tenant-b", "free");

  await services.workspaceManager.createWorkspace("ws-a1", "Workspace Alpha-1", "org-a", "tenant-a");
  await services.workspaceManager.createWorkspace("ws-b1", "Workspace Beta-1", "org-b", "tenant-b");

  // Create primary test users
  const userA = await services.userService.createUser(
    "alice@alpha.com",
    "alice@alpha.com",
    "Alice",
    "org-a",
    ["ws-a1"],
    "Recruiter",
    "tenant-a"
  );

  const userB = await services.userService.createUser(
    "bob@beta.com",
    "bob@beta.com",
    "Bob",
    "org-b",
    ["ws-b1"],
    "Manager",
    "tenant-b"
  );

  // 1. Login verification
  await suite.run("Login successfully establishes session context and refresh tokens", async () => {
    const { session, refreshToken } = await services.sessionService.createSession(
      userA.id,
      userA.email,
      userA.organizationId,
      userA.workspaceIds,
      userA.role,
      userA.tenantId,
      3600,
      { ip: "127.0.0.1", userAgent: "Node Test Suite" }
    );

    assert.ok(session.sessionId, "Session ID must be generated");
    assert.ok(refreshToken, "Refresh token must be generated");
    assert.equal(session.userId, "alice@alpha.com", "Session must bind correct user");
    assert.equal(session.tenantId, "tenant-a", "Session must bind correct tenant context");

    const validated = await services.sessionService.validateSession(session.sessionId);
    assert.equal(validated.sessionId, session.sessionId, "Validation retrieves correct session");
  });

  // 2. Logout and Session Revocation
  await suite.run("Logout successfully invalidates session and revokes refresh status", async () => {
    const { session } = await services.sessionService.createSession(
      userA.id,
      userA.email,
      userA.organizationId,
      userA.workspaceIds,
      userA.role,
      userA.tenantId,
      3600
    );

    await services.sessionService.revokeSession(session.sessionId);

    await assert.throws(async () => {
      await services.sessionService.validateSession(session.sessionId);
    }, "Session has been revoked", "Validating a revoked session must fail");
  });

  // 3. Session Expiry Enforcement
  await suite.run("Session expiry restricts usage once window is crossed", async () => {
    const { session } = await services.sessionService.createSession(
      userA.id,
      userA.email,
      userA.organizationId,
      userA.workspaceIds,
      userA.role,
      userA.tenantId,
      -10 // Expired 10 seconds ago
    );

    await assert.throws(async () => {
      await services.sessionService.validateSession(session.sessionId);
    }, "Session has expired", "Validating an expired session must fail");
  });

  // 4. Organization Creation & Isolation
  await suite.run("Organization creation respects multi-tenancy boundaries", async () => {
    const org = await services.organizationService.createOrganization("org-test", "Isolation Test Org", "tenant-a");
    assert.equal(org.tenantId, "tenant-a", "Organization must belong to creator's tenant");

    const retrieved = await services.organizationService.getOrganization("org-test", "tenant-a");
    assert.ok(retrieved, "Should retrieve organization under valid tenant context");
  });

  // 5. Workspace Creation & Context Validation
  await suite.run("Workspace boundaries map correctly to organizations", async () => {
    const ws = await services.workspaceManager.createWorkspace("ws-test", "Test Workspace", "org-a", "tenant-a");
    assert.equal(ws.organizationId, "org-a", "Workspace must map to the target organization");
    assert.equal(ws.tenantId, "tenant-a", "Workspace must carry tenant ID");
  });

  // 6. User Creation with organization hierarchy mapping
  await suite.run("Users are securely created and assigned role templates", async () => {
    const newUser = await services.userService.createUser(
      "charles@alpha.com",
      "charles@alpha.com",
      "Charles",
      "org-a",
      ["ws-a1"],
      "Viewer",
      "tenant-a"
    );

    assert.equal(newUser.role, "Viewer", "User must be assigned correct role template");
    assert.equal(newUser.organizationId, "org-a", "User must carry correct organization association");
  });

  // 7. Role and Permission Enforcement
  await suite.run("Role and permission services accurately verify permissions", async () => {
    // Viewer should have "Read" but not "Create" or "Delete"
    const hasRead = await services.permissionService.hasPermission("Viewer", "Read");
    const hasDelete = await services.permissionService.hasPermission("Viewer", "Delete");

    assert.equal(hasRead, true, "Viewer should have Read permission");
    assert.equal(hasDelete, false, "Viewer should not have Delete permission");

    // Recruiter should have "Review"
    const recruiterHasReview = await services.permissionService.hasPermission("Recruiter", "Review");
    assert.equal(recruiterHasReview, true, "Recruiter should have Review permission");
  });

  // 8. Custom role assignment & permissions evaluation
  await suite.run("Custom roles can be created and checked seamlessly", async () => {
    const customRole = await services.roleService.createCustomRole("Special reviewer", ["Read", "Review", "Approve"], "org-a");
    assert.equal(customRole.name, "Special reviewer", "Custom role name should match");

    const hasApprove = await services.permissionService.hasPermission("Special reviewer", "Approve", "org-a");
    assert.equal(hasApprove, true, "Custom role permissions must be resolvable");
  });

  // 9. Tenant Isolation
  await suite.run("Users cannot cross boundaries into other tenant contexts", async () => {
    // Validate isolation helper
    const isValid = services.permissionService.validateIsolation(userA, {
      tenantId: "tenant-b",
      organizationId: "org-b",
      workspaceId: "ws-b1",
    });

    assert.equal(isValid, false, "Tenant validation must reject cross-tenant scopes");
  });

  // 10. Cross-Tenant Data Rejections
  await suite.run("Attempts to read data belonging to different tenant triggers rejection", async () => {
    await assert.throws(async () => {
      // Alice tries to get organization org-b which belongs to Bob's tenant-b
      await services.organizationService.getOrganization("org-b", "tenant-a");
    }, "Cross-tenant data access rejected for tenant tenant-a", "Accessing other tenant's organization must fail");
  });

  // 11. Concurrent Logins Load Test
  await suite.run("Stress test validates support for 1000 concurrent sessions", async () => {
    const startCount = services.sessionService.getActiveSessionsCount();
    await services.sessionService.simulateConcurrentSessions(1000, "tenant-a");
    const endCount = services.sessionService.getActiveSessionsCount();

    assert.equal(endCount - startCount, 1000, "Must securely instantiate and register 1000 active sessions concurrently");
  });

  // 12. Security Audit Log verification
  await suite.run("Security actions seamlessly post logs to the audit history", async () => {
    const startLogs = await services.auditIdentityService.getTenantLogs("tenant-a");
    
    await services.auditIdentityService.logEvent(
      "alice@alpha.com",
      "Permission Changes",
      "Upgraded role level manually",
      "tenant-a"
    );

    const endLogs = await services.auditIdentityService.getTenantLogs("tenant-a");
    assert.equal(endLogs.length - startLogs.length, 1, "Audit logs count must increment on logged events");
  });

  suite.report();
  process.exit(0);
}

runIdentityPlatformTests().catch((err) => {
  console.error("Test suite execution crashed:", err);
  process.exit(1);
});
