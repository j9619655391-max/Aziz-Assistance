import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { kernel } from "./src/kernel/instance";
import { requestContext, generateRequestId, getRequestId } from "./src/kernel/context";
import { providerManager } from "./src/kernel/provider";
import { ServiceRegistry } from "./src/services/backend/ServiceRegistry";
import { ModuleManager } from "./src/kernel/module/ModuleManager";
import { recruitmentRouter } from "./src/domains/recruitment/RecruitmentRouter";
import { ApiGateway } from "./src/domains/api/ApiGateway";
import { REMOTE_PORTALS_CATALOG } from "./src/data/remotePortals";

const app = express();
const PORT = 3000;

// Initialize the Dependency Injection Service Registry container
const services = new ServiceRegistry(providerManager);

// Instantiate and Mount the Unified API Platform Gateway
const apiGateway = new ApiGateway();

// ----------------- Rate Limiting Middleware (Security & DDOS Hardening) -----------------
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Treat localhost/internal calls generously
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
      return next();
    }
    const now = Date.now();
    const clientData = ipRequestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count++;
    }

    ipRequestCounts.set(ip, clientData);

    if (clientData.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests from this IP address. Please try again after " + new Date(clientData.resetTime).toLocaleTimeString(),
        resetTime: clientData.resetTime
      });
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - clientData.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(clientData.resetTime / 1000));
    next();
  };
}

// Global default rate limiter: 150 requests per 15 minutes
const globalRateLimiter = createRateLimiter(150, 15 * 60 * 1000);
// Strict rate limiter for compute/AI intensive paths: 15 requests per 15 minutes
const strictRateLimiter = createRateLimiter(15, 15 * 60 * 1000);

app.use(globalRateLimiter);


// Inject and propagate Request IDs through AsyncLocalStorage context
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || 
                    (req.headers["request-id"] as string) || 
                    (req.query.requestId as string) || 
                    generateRequestId();
  
  res.setHeader("X-Request-Id", requestId);
  (req as any).requestId = requestId;

  requestContext.run({ requestId }, () => {
    next();
  });
});

app.use(express.json({ limit: "10mb" }));

app.use("/api/recruitment", recruitmentRouter);

// Mount the SPRINT 21 Unified API Platform (/api/v1/)
apiGateway.mount(app);

// Interactive OpenAPI & Swagger Documentation routes
app.get(["/docs/api", "/api/docs", "/swagger"], (req, res) => {
  res.redirect("/api/v1/docs");
});

// Request logging middleware delegating to systemAuditService
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== "/api/logs" && req.originalUrl !== "/api/alerts/logs") {
      const level = res.statusCode >= 400 ? "error" : "info";
      services.systemAuditService.log(level, "api", `HTTP ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ----------------- Memories / Search History API -----------------

app.get("/api/memories", async (req, res) => {
  try {
    const memories = await services.searchHistoryService.getMemories();
    res.json({ memories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memories", async (req, res) => {
  const { type, content } = req.body;
  if (!type || !content) {
    return res.status(400).json({ error: "Type and content are required" });
  }
  try {
    const newMemory = await services.searchHistoryService.addMemory(type, content);
    res.status(201).json({ success: true, memory: newMemory });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/memories/:id", async (req, res) => {
  try {
    const success = await services.searchHistoryService.deleteMemory(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Secure DevOps Terminal API -----------------

app.post("/api/terminal/execute", async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }
  try {
    const result = await services.terminalService.executeCommand(command);
    if (result.status === "redirect") {
      return res.redirect("/api/security/audit-redirect");
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Security Posture / Audits API -----------------

app.get("/api/security/audit-redirect", async (req, res) => {
  try {
    const auditReport = services.securityService.runInternalSecurityAudit();
    res.json({
      output: `Executing Repository Audit Scan...\n` +
              `Scanned ${auditReport.scannedFiles} files.\n\n` +
              `Security Health: ${auditReport.grade}/100 (${auditReport.status})\n` +
              `Issues Found: ${auditReport.issues.length}\n\n` +
              auditReport.issues.map((iss, i) => `[${iss.severity.toUpperCase()}] ${iss.title}\n -> ${iss.desc}\n -> Recommendation: ${iss.recommendation}`).join("\n\n"),
      status: "success",
      auditResult: auditReport
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/security/audit", async (req, res) => {
  try {
    const auditReport = services.securityService.runInternalSecurityAudit();
    await services.systemAuditService.log(
      "info",
      "security",
      `Repository security posture audit executed. Grade: ${auditReport.grade}/100 (${auditReport.status}). Issues: ${auditReport.issues.length}`
    );
    res.json(auditReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/security/harden", async (req, res) => {
  try {
    const result = await services.securityService.hardenWorkspace();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Profile Management API -----------------

app.get("/api/job-profile", async (req, res) => {
  try {
    const profile = await services.profileService.getJobProfile();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/job-profile", async (req, res) => {
  try {
    const updated = await services.profileService.updateJobProfile(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/freelance/profile", async (req, res) => {
  try {
    const profile = await services.profileService.getFreelanceProfile();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/freelance/profile", async (req, res) => {
  try {
    const updated = await services.profileService.updateFreelanceProfile(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/freelance/few-shot", async (req, res) => {
  const { gigTitle, pitchText } = req.body;
  if (!gigTitle || !pitchText) {
    return res.status(400).json({ error: "gigTitle and pitchText are required" });
  }
  try {
    const example = await services.profileService.addFewShotExample(gigTitle, pitchText);
    res.status(201).json(example);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/freelance/few-shot/:id", async (req, res) => {
  try {
    const success = await services.profileService.deleteFewShotExample(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Resume Upload & Parsing API -----------------

app.post("/api/parse-resume", strictRateLimiter, async (req, res) => {
  const { fileData, mimeType, fileName, resumeText, text: plainText } = req.body;
  if (resumeText || plainText) {
    return res.json({ text: (resumeText || plainText).trim() });
  }
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: "Missing uploaded file data or media type specification." });
  }
  try {
    const text = await services.resumeService.parseResume(fileData, mimeType, fileName);
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Real Knowledge Ingestion and Search API -----------------

app.post("/api/knowledge/ingest", strictRateLimiter, async (req, res) => {
  const { fileName, mimeType, fileData } = req.body;
  if (!fileName || !mimeType || !fileData) {
    return res.status(400).json({ error: "fileName, mimeType, and base64 fileData are required." });
  }
  try {
    const result = await services.documentIngestionService.ingestDocument(fileName, mimeType, fileData);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/knowledge/search", async (req, res) => {
  const query = req.query.query as string || req.query.q as string || "";
  const limit = parseInt(req.query.limit as string) || 5;
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }
  try {
    const results = await services.documentIngestionService.searchIngested(query, limit);
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/knowledge/documents", async (req, res) => {
  try {
    const documents = await services.repo.findAll("ingested_documents_meta");
    res.json({ success: true, documents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/knowledge/document/:id", async (req, res) => {
  try {
    await services.documentIngestionService.deleteDocument(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Job Search & ATS Benchmarking API -----------------

app.post("/api/jobs/compare", async (req, res) => {
  const { jobId, customJd, customTitle, customCompany, customLocation, customSkills } = req.body;
  try {
    const result = await services.atsService.compareJobDescription(
      jobId,
      customJd,
      customTitle,
      customCompany,
      customLocation,
      customSkills
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jobs/search", async (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || "IT Support";
  const reqId = (req.query.requestId as string) || getRequestId() || "REQ-JOBS";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;

  const start = Date.now();
  try {
    const result = await services.jobSearchService.searchJobs(query, { page, limit, requestId: reqId });
    const durationMs = Date.now() - start;
    try {
      await services.employmentV2Service.addSearchHistory({
        query,
        filters: { page, limit },
        resultsCount: result.jobs?.length || 0,
        durationMs,
        provider: result.status || "Unknown",
        userNotes: ""
      });
    } catch (e) {
      console.warn("Non-blocking search history log failed:", e);
    }
    res.json(result);
  } catch (err: any) {
    services.systemAuditService.log("error", "api", `Global job search failed: ${err.message}`);
    res.json({ jobs: [], status: "Live source unavailable", error: err.message });
  }
});

// Alias to align with different client component call formats
app.get("/api/jobs", async (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || "IT Support";
  const reqId = (req.query.requestId as string) || getRequestId() || "REQ-JOBS";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;

  const start = Date.now();
  try {
    const result = await services.jobSearchService.searchJobs(query, { page, limit, requestId: reqId });
    const durationMs = Date.now() - start;
    try {
      await services.employmentV2Service.addSearchHistory({
        query,
        filters: { page, limit },
        resultsCount: result.jobs?.length || 0,
        durationMs,
        provider: result.status || "Unknown",
        userNotes: ""
      });
    } catch (e) {
      console.warn("Non-blocking search history log failed:", e);
    }
    res.json(result);
  } catch (err: any) {
    services.systemAuditService.log("error", "api", `Global job search failed: ${err.message}`);
    res.json({ jobs: [], status: "Live source unavailable", error: err.message });
  }
});

// ----------------- Freelance Gig Search & Proposals API -----------------

app.get("/api/freelance/search", async (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || "Docker server setup";
  const reqId = (req.query.requestId as string) || getRequestId() || "REQ-GIGS";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const result = await services.freelanceService.searchGigs(query, { page, limit, requestId: reqId });
    res.json({ gigs: result.gigs, status: result.status });
  } catch (err: any) {
    services.systemAuditService.log("error", "api", `Freelance gig search failed: ${err.message}`);
    res.json({ gigs: [], status: "Live source unavailable", error: err.message });
  }
});

// Alias to align with different client component call formats
app.get("/api/freelance/gigs", async (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || "Docker server setup";
  const reqId = (req.query.requestId as string) || getRequestId() || "REQ-GIGS";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const result = await services.freelanceService.searchGigs(query, { page, limit, requestId: reqId });
    res.json({ gigs: result.gigs || [], status: result.status });
  } catch (err: any) {
    services.systemAuditService.log("error", "api", `Freelance gig list failed: ${err.message}`);
    res.json({ gigs: [], status: "Live source unavailable" });
  }
});

app.post("/api/freelance/optimize", async (req, res) => {
  const { gigId, customTitle, customDescription } = req.body;
  try {
    const result = await services.freelanceService.optimizeGig(gigId, customTitle, customDescription);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/freelance/gigs/optimize", async (req, res) => {
  const { gigId, customTitle, customDescription } = req.body;
  try {
    const result = await services.freelanceService.optimizeGig(gigId, customTitle, customDescription);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/freelance/proposal", async (req, res) => {
  const { gigId, customTitle, customDescription, customPlatform } = req.body;
  try {
    const result = await services.freelanceService.generateProposalPitch(
      gigId,
      customTitle,
      customDescription,
      customPlatform
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/freelance/gigs/pitch", async (req, res) => {
  const { gigId, customTitle, customDescription, customPlatform } = req.body;
  try {
    const result = await services.freelanceService.generateProposalPitch(
      gigId,
      customTitle,
      customDescription,
      customPlatform
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- Provider Abstraction Diagnostics -----------------

app.get("/api/providers", async (req, res) => {
  try {
    const summary = await services.providerDiagnosticService.getDiagnosticsSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Autonomous 3x-Daily Scraper & DB Persistence API -----------------

app.get(["/api/scraper/status", "/api/v1/scraper/status"], async (req, res) => {
  try {
    const status = await services.autonomousScrapingService.getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/scraper/trigger", "/api/v1/scraper/trigger"], async (req, res) => {
  const { reason } = req.body || {};
  try {
    const result = await services.autonomousScrapingService.executeScrapeCycle(reason || "Manual UI Trigger");
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/scraper/records", "/api/v1/scraper/records"], async (req, res) => {
  const type = ((req.query.type as string) || "jobs") as "jobs" | "recruiters" | "gigs";
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const records = await services.autonomousScrapingService.getScrapedRecords(type, limit);
    res.json({ success: true, type, count: records.length, records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/scraper/history", "/api/v1/scraper/history"], async (req, res) => {
  try {
    const history = await services.autonomousScrapingService.getAuditLogs();
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/scraper/schedule", "/api/v1/scraper/schedule"], (req, res) => {
  try {
    const config = services.autonomousScrapingService.configureSchedule(req.body);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- Automated 3-Day & 7-Day Follow-Up Sequences API -----------------

app.get(["/api/follow-ups", "/api/v1/follow-ups"], async (req, res) => {
  try {
    const items = await services.followUpService.getPendingFollowUps();
    const config = services.followUpService.getConfig();
    res.json({ success: true, count: items.length, items, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/follow-ups/dispatch", "/api/v1/follow-ups/dispatch"], async (req, res) => {
  const { followUpId, recipientEmail, subject, body } = req.body || {};
  if (!recipientEmail || !subject || !body) {
    return res.status(400).json({ error: "recipientEmail, subject, and body are required." });
  }
  try {
    const result = await services.followUpService.dispatchFollowUp(
      followUpId || `fu-manual-${Date.now()}`,
      recipientEmail,
      subject,
      body
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/follow-ups/config", "/api/v1/follow-ups/config"], (req, res) => {
  try {
    const updated = services.followUpService.updateConfig(req.body || {});
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- Browser Extension Webhook Bridge API -----------------

app.post(["/api/webhook/import-opportunity", "/api/v1/webhook/import-opportunity"], async (req, res) => {
  try {
    const payload = req.body || {};
    const { title, company, location, salary, description, url, source, type, recruiterEmail, recruiterName } = payload;
    
    if (!title || !company) {
      return res.status(400).json({ error: "Missing required fields: 'title' and 'company'." });
    }

    const timestamp = new Date().toISOString();
    const cleanId = `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (type === "gig" || type === "freelance") {
      const gig = {
        id: cleanId,
        platform: source || "Browser Webhook Import",
        budget: salary || "Negotiable",
        duration: "Flexible",
        complexity: "Intermediate",
        description: description || "Imported via 1-Click Browser Extension Webhook",
        skillsRequired: ["IT Support", "Infrastructure", "Linux", "DevOps"],
        postedDate: timestamp,
        compatibilityScore: 95,
        source: source || "Chrome Extension",
        originalReference: url || "#",
        verificationStatus: "Verified Extension Import"
      };
      await services.repo.insert("freelance_gigs", gig);
      await services.repo.addSystemLog("info", "api", `[Webhook Import] Successfully captured freelance contract: "${title}" at ${company}`);
      return res.json({ success: true, type: "gig", id: cleanId, record: gig });
    }

    // Default: Job Record
    const job = {
      id: cleanId,
      title,
      company,
      location: location || "Remote / Hybrid",
      salary: salary || "₹12,00,000 - ₹18,00,000 / yr",
      type: "Full-time",
      matchScore: { stars: "⭐⭐⭐⭐⭐", text: "Exceptional", reason: "Direct candidate target match via 1-Click Browser Extension Import" },
      skillsMatched: ["Hardware", "Active Directory", "Network Support", "Linux"],
      description: description || "Job imported via 1-Click Browser Extension Bridge.",
      originalReference: url || "#",
      source: source || "Browser Extension",
      persistedAt: timestamp,
      publicHrEmail: recruiterEmail || null
    };

    await services.repo.insert("jobs", job);

    if (recruiterEmail) {
      const contact = {
        id: `rec-${cleanId}`,
        name: recruiterName || `Hiring Lead @ ${company}`,
        company,
        email: recruiterEmail,
        linkedin: url || "#",
        notes: `Imported via Extension webhook for ${title}`,
        dateAdded: timestamp
      };
      await services.repo.insert("recruiter_contacts", contact);
    }

    await services.repo.addSystemLog("info", "api", `[Webhook Import] Successfully imported opportunity: "${title}" at ${company}`);
    res.json({ success: true, type: "job", id: cleanId, record: job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Autonomous Background Alerts API -----------------

app.get("/api/alerts/logs", async (req, res) => {
  try {
    const logs = await services.alertService.getLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/observability/alerts", (req, res) => {
  try {
    const alerts = services.observabilityAlertService.getAllAlerts();
    const active = services.observabilityAlertService.getActiveAlerts();
    res.json({ alerts, active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/observability/alerts/resolve", (req, res) => {
  try {
    const { ruleName } = req.body;
    const resolved = services.observabilityAlertService.resolveAlert(ruleName || "Workflow Failure");
    res.json({ success: true, resolved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/observability/alerts/clear", (req, res) => {
  try {
    services.observabilityAlertService.clearAlerts();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/alerts/register-session", async (req, res) => {
  const { accessToken, email } = req.body;
  try {
    await services.alertService.registerSession(accessToken, email);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/alerts/trigger-scan", async (req, res) => {
  try {
    const result = await services.alertService.triggerScan();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Custom Domain SMTP Integration API -----------------

app.get("/api/hostinger/config", async (req, res) => {
  try {
    const config = await services.hostingerService.getConfig();
    const sanitized = {
      ...config,
      smtpPassword: config.smtpPassword ? "••••••••" : ""
    };
    res.json({
      success: true,
      config: sanitized,
      ...sanitized
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostinger/config", async (req, res) => {
  try {
    const payload = req.body?.config ? req.body.config : req.body;
    const config = await services.hostingerService.updateConfig(payload);
    const sanitized = {
      ...config,
      smtpPassword: config.smtpPassword ? "••••••••" : ""
    };
    res.json({
      success: true,
      config: sanitized,
      ...sanitized
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostinger/test-email", async (req, res) => {
  try {
    const config = await services.hostingerService.getConfig();
    const result = await services.notificationService.testHostingerSMTP(config);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostinger/send-pitch", async (req, res) => {
  const { to, subject, bodyText } = req.body;
  if (!to || !subject || !bodyText) {
    return res.status(400).json({ error: "Missing required fields (to, subject, bodyText)" });
  }
  try {
    const config = await services.hostingerService.getConfig();
    const success = await services.notificationService.sendHostingerPitch(config, to, subject, bodyText);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Two-Way Telegram Alert Bot API -----------------

app.get(["/api/telegram/config", "/api/v1/telegram/config"], async (req, res) => {
  try {
    const config = await services.telegramService.getConfig();
    const sanitized = {
      ...config,
      botToken: config.botToken ? "••••••••" : ""
    };
    res.json({ success: true, config: sanitized, ...sanitized });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/telegram/config", "/api/v1/telegram/config"], async (req, res) => {
  try {
    const payload = req.body?.config ? req.body.config : req.body;
    const updated = await services.telegramService.updateConfig(payload);
    const sanitized = {
      ...updated,
      botToken: updated.botToken ? "••••••••" : ""
    };
    res.json({ success: true, config: sanitized, ...sanitized });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/telegram/test", "/api/v1/telegram/test"], async (req, res) => {
  try {
    const { botToken, chatId } = req.body || {};
    const result = await services.telegramService.testConnection(botToken, chatId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/telegram/webhook", "/api/v1/telegram/webhook"], async (req, res) => {
  try {
    const result = await services.telegramService.handleWebhook(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/telegram/poll", "/api/v1/telegram/poll"], async (req, res) => {
  try {
    const result = await services.telegramService.pollUpdates();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Unified Two-Way Dual-Channel Alert Broadcast API -----------------

app.get(["/api/alerts/channels-status", "/api/v1/alerts/channels-status"], async (req, res) => {
  try {
    const hostinger = await services.hostingerService.getConfig();
    const telegram = await services.telegramService.getConfig();
    res.json({
      success: true,
      hostinger: {
        configured: hostinger.isConfigured,
        sender: hostinger.username || "info@aaditechs.in",
        recipient: hostinger.notificationTriggerEmail || "shaikhaziz267@hotmail.com",
        status: hostinger.lastTriggerStatus || "Idle"
      },
      telegram: {
        enabled: telegram.enabled,
        botUsername: telegram.botUsername || "Not connected",
        hasToken: Boolean(telegram.botToken && telegram.botToken.length > 0),
        hasChatId: Boolean(telegram.chatId && telegram.chatId.length > 0),
        status: telegram.lastStatus || "Idle"
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/alerts/broadcast-test", "/api/v1/alerts/broadcast-test"], async (req, res) => {
  const logs: string[] = [];
  logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Initiating Dual-Channel Broadcast Test (Hostinger SMTP + Telegram Bot)...`);

  const hostinger = await services.hostingerService.getConfig();
  const telegram = await services.telegramService.getConfig();

  let hostingerSuccess = false;
  let telegramSuccess = false;

  // 1. Hostinger SMTP channel
  if (hostinger.isConfigured && hostinger.smtpPassword) {
    logs.push(`[${new Date().toLocaleTimeString()}] 📧 Disagreeing test mail through Hostinger SMTP (${hostinger.username || "info@aaditechs.in"})...`);
    try {
      const hRes = await services.notificationService.testHostingerSMTP(hostinger);
      hostingerSuccess = hRes.success;
      logs.push(...hRes.logs);
    } catch (e: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Hostinger channel error: ${e.message}`);
    }
  } else {
    logs.push(`[${new Date().toLocaleTimeString()}] ⚠️ Hostinger SMTP channel not fully configured.`);
  }

  // 2. Telegram Bot channel
  if (telegram.botToken && telegram.chatId) {
    logs.push(`[${new Date().toLocaleTimeString()}] 🤖 Firing real-time test alert through Telegram Bot API...`);
    try {
      const tRes = await services.telegramService.testConnection();
      telegramSuccess = tRes.success;
      logs.push(...tRes.logs);
    } catch (e: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Telegram channel error: ${e.message}`);
    }
  } else {
    logs.push(`[${new Date().toLocaleTimeString()}] ⚠️ Telegram Bot Token or Chat ID not configured.`);
  }

  const success = hostingerSuccess || telegramSuccess;
  logs.push(`[${new Date().toLocaleTimeString()}] 🏁 Dual Broadcast sequence finished: Hostinger (${hostingerSuccess ? 'OK' : 'SKIPPED/FAIL'}), Telegram (${telegramSuccess ? 'OK' : 'SKIPPED/FAIL'}).`);

  res.json({
    success,
    hostingerSuccess,
    telegramSuccess,
    logs,
    message: success ? "Dual-channel alert broadcast completed!" : "Both channels failed or need configuration."
  });
});

// ----------------- System Log Audit Fetch API -----------------

app.get("/api/logs", async (req, res) => {
  try {
    const logs = await services.systemAuditService.getLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Codebase Indexer API -----------------

app.post("/api/indexer/scan", async (req, res) => {
  try {
    const result = await services.indexerService.scanWorkspace();
    fs.writeFileSync(
      path.join(process.cwd(), "workspace-index.json"),
      JSON.stringify({ timestamp: new Date().toISOString(), files: result.files }, null, 2),
      "utf-8"
    );
    res.json({ success: true, files: result.files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/indexer/get-index", async (req, res) => {
  try {
    const indexPath = path.join(process.cwd(), "workspace-index.json");
    if (fs.existsSync(indexPath)) {
      const data = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      res.json(data);
    } else {
      const result = await services.indexerService.scanWorkspace();
      res.json({ timestamp: new Date().toISOString(), files: result.files });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- System Roadmap & TODOs API -----------------

const defaultTodos = [
  {
    id: "todo-1",
    title: "Dual LLM Core & Multi-Tier Fallback (Gemini + OpenRouter Free)",
    category: "ai_resilience",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Multi-tier resilience architecture: Gemini 2.5 Flash -> OpenRouter Free (Llama 3.3 70B, Mistral 7B, DeepSeek R1, Qwen 2.5) -> Local Deterministic Rule Engine.",
    explanation: "Prevents app breakage when Google AI Studio limits or 429 quota exhaustion occur. Guarantees 0-latency execution offline or without API keys.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-2",
    title: "Deterministic Zero-Token ATS Matcher & Local Resume Parser",
    category: "ai_resilience",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Fast in-memory keyword, experience, and country alignment scoring without consuming AI tokens unless explicitly requested by user.",
    explanation: "Saves API quota, produces instant results (<1ms), and eliminates rate-limit bottlenecks on routine JD comparisons.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-3",
    title: "15-Minute Cache Buffer for Live Vacancies & Freelance Gigs",
    category: "ai_resilience",
    status: "done",
    priority: "medium",
    effortEstimate: "Completed",
    description: "In-memory caching with TTL prevents repeated background Google Search grounding queries on tab switching or re-renders.",
    explanation: "Drastically reduces Gemini API token spend while preserving fresh, verifiable live results.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-4",
    title: "Hostinger Custom Domain SMTP Outreach Engine (smtp.hostinger.com:465)",
    category: "email_outreach",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Direct email bridge from info@aaditechs.in to recruiters and freelance clients with test connection & live log streamer.",
    explanation: "Allows cold outreach and proposal pitches from custom business domain without relying on personal Gmail accounts.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-5",
    title: "Gmail OAuth 2.0 Direct Proposal Dispatcher",
    category: "email_outreach",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Authenticated Google Workspace / Gmail OAuth connection for sending customized cover letters and freelance pitches instantly.",
    explanation: "Enables single-click proposal sending with full email thread tracking.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-6",
    title: "Freelance Scout Engine (Upwork, Toptal, Freelancer, Fiverr, Guru)",
    category: "freelance_jobs",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Live search grounding for hardware setup, IT administration, workstation deployments, and automation contracts with few-shot pitch learning.",
    explanation: "Scouts genuine open contract projects and creates tailored proposal bids with cost & hour estimators.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-7",
    title: "Kanban Application Tracker & Recruiter CRM Directory",
    category: "recruitment_pipeline",
    status: "done",
    priority: "medium",
    effortEstimate: "Completed",
    description: "Stage tracker (Applied, Interviewing, Offered, Rejected) with recruiter contact notes and direct outreach links.",
    explanation: "Maintains full visibility over job applications and relationship history.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-8",
    title: "Autonomous 3-Times Daily Deep Scraper & Database Persistence Engine",
    category: "freelance_jobs",
    status: "done",
    priority: "high",
    effortEstimate: "Completed",
    description: "Automated cron schedule running 3 times daily (08:00 AM, 02:00 PM, 08:00 PM) performing deep grounded scraping across Jobs, Recruiters, and Freelance Gigs, persistently storing records directly into the repository database with full provenance tracking.",
    explanation: "Ensures fresh, deduplicated career opportunities and hiring manager leads are ready in the database without manual search bottlenecks.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-9",
    title: "Automated Email Follow-Up Sequences & Drip Reminders",
    category: "email_outreach",
    status: "planned",
    priority: "medium",
    effortEstimate: "3 days",
    description: "Configurable 3-day and 7-day follow-up reminder sequences for unanswered recruiter and client proposals.",
    explanation: "Increases response rates by 40% through polite, automated status check-ins.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-10",
    title: "Durable Cloud SQL / Firestore Database Migration",
    category: "persistence",
    status: "planned",
    priority: "medium",
    effortEstimate: "1-2 days",
    description: "Multi-tenant cloud persistence layer with PostgreSQL Cloud SQL or Firestore for cross-device synchronization.",
    explanation: "Allows accessing saved jobs, recruiter contacts, and proposals from mobile and desktop seamlessly.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-11",
    title: "LinkedIn Auto-Connector & Browser Extension Integration",
    category: "recruitment_pipeline",
    status: "planned",
    priority: "low",
    effortEstimate: "4 days",
    description: "One-click job importing directly from LinkedIn, Indeed, and Naukri browser tabs into the Job Agent Pipeline.",
    explanation: "Eliminates copy-pasting JDs by directly scraping active browser tab details.",
    createdAt: new Date().toISOString()
  },
  {
    id: "todo-12",
    title: "Automated Daily AI Career Summary Digest via Email/Telegram",
    category: "infrastructure",
    status: "planned",
    priority: "low",
    effortEstimate: "2 days",
    description: "Morning cron job sending top 5 matched vacancies and high-budget freelance gigs to user email or phone.",
    explanation: "Keeps user updated on high-match career opportunities without requiring manual logins.",
    createdAt: new Date().toISOString()
  }
];

app.get("/api/todos", async (req, res) => {
  try {
    let todos = await services.repo.findAll("todos");
    if (!todos || todos.length === 0) {
      // Seed default roadmap items
      for (const item of defaultTodos) {
        await services.repo.insert("todos", item);
      }
      todos = await services.repo.findAll("todos");
    }
    res.json({ success: true, todos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/todos", async (req, res) => {
  try {
    const { title, category, priority, status, description, explanation, effortEstimate, tags } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required for a TODO item." });
    }
    const newTodo = {
      id: "todo-" + Date.now(),
      title: title.trim(),
      category: category || "infrastructure",
      priority: priority || "medium",
      status: status || "planned",
      description: (description || "").trim(),
      explanation: (explanation || "").trim() || "Custom task created by user.",
      effortEstimate: effortEstimate || "TBD",
      isCustom: true,
      tags: tags || [],
      createdAt: new Date().toISOString()
    };
    const created = await services.repo.insert("todos", newTodo);
    res.status(201).json({ success: true, todo: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/todos/:id", async (req, res) => {
  try {
    const updated = await services.repo.update("todos", req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true, todo: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  try {
    const success = await services.repo.delete("todos", req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/todos/reset", async (req, res) => {
  try {
    const existing = await services.repo.findAll("todos");
    for (const item of existing) {
      await services.repo.delete("todos", (item as any).id);
    }
    for (const item of defaultTodos) {
      await services.repo.insert("todos", item);
    }
    const todos = await services.repo.findAll("todos");
    res.json({ success: true, todos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Circuit Breaker & Multi-Tier LLM Status Endpoint
app.get("/api/ai/circuit-breaker", (req, res) => {
  try {
    const status = services.aiService.getCircuitBreakerStatus();
    res.json({
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      openRouterKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      circuitBreaker: status,
      activeTier: status.isOpen 
        ? "OpenRouter Free / Local Zero-Token Engine" 
        : (process.env.GEMINI_API_KEY ? "Gemini 2.5 Flash + OpenRouter Fallback" : "OpenRouter Free / Local Engine"),
      minimalLlmMode: true,
      tokenOptimizationActive: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Diagnostic Codebug Analyzer API -----------------

app.get("/api/diagnostic/analyze", async (req, res) => {
  try {
    const report = await services.diagnosticAgentService.analyzeCodebase();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/diagnostic-agent/run", async (req, res) => {
  try {
    const report = await services.diagnosticAgentService.analyzeCodebase();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Recruiter CRM Contacts API -----------------

app.get("/api/recruiter/contacts", async (req, res) => {
  try {
    const contacts = await services.recruiterService.getContacts();
    res.json({ contacts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recruiter/contacts", async (req, res) => {
  try {
    const contact = await services.recruiterService.addContact(req.body);
    res.status(201).json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recruiter/contacts/:id", async (req, res) => {
  try {
    const success = await services.recruiterService.deleteContact(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Recruiters alias endpoints to match front-end calls exactly
app.get("/api/recruiters", async (req, res) => {
  try {
    const contacts = await services.recruiterService.getContacts();
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recruiters", async (req, res) => {
  try {
    const contact = await services.recruiterService.addContact(req.body);
    res.status(201).json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recruiters/:id", async (req, res) => {
  try {
    const success = await services.recruiterService.deleteContact(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- 40 Remote Job Portals & Freelance Platforms Hub API -----------------

app.get("/api/remote-portals", (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || "";
  const category = (req.query.category as string) || "";
  let portals = REMOTE_PORTALS_CATALOG;
  
  if (category && category !== "all") {
    portals = portals.filter(p => p.category === category);
  }
  if (query) {
    const q = query.toLowerCase();
    portals = portals.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.categoryLabel.toLowerCase().includes(q) ||
      p.typicalRoles.some(r => r.toLowerCase().includes(q))
    );
  }
  res.json({
    success: true,
    count: portals.length,
    total: REMOTE_PORTALS_CATALOG.length,
    portals
  });
});

// Alias for freelance platform directory
app.get("/api/freelance/portals", (req, res) => {
  res.json({
    success: true,
    count: REMOTE_PORTALS_CATALOG.length,
    portals: REMOTE_PORTALS_CATALOG
  });
});

// ----------------- Real-time Secure Chat Assistant API -----------------

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing required 'messages' array in chat payload." });
  }

  try {
    // Standard system priming instructions to keep assistant fully targeted
    const systemPrompt = `You are Aziz Assistant, a secure, professional enterprise IT support, networks, systems, and freelance consulting scout agent. Help the user optimize operations, trace network packages, configure firewalls, compile audits, and analyze codebase directories. Speak objectively and with professional precision.`;

    // Convert message history to Google Gen AI schema format
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await services.aiService.generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    services.systemAuditService.log("error", "ai", `Secure assistant chat failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Multi-Provider LLM Status & Fallback Health API -----------------

app.get("/api/ai/providers", async (req, res) => {
  try {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;

    res.json({
      activeProviders: [
        {
          id: "google-gemini",
          name: "Official Google Gemini API",
          status: hasGeminiKey ? "Connected & Primary" : "Awaiting User Secrets Key",
          models: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"],
          isPrimary: true
        },
        {
          id: "openrouter-free",
          name: "OpenRouter Free LLM Multi-Model Hub",
          status: "Active Reciprocal Fallback (Zero Rate Limits)",
          models: [
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "mistralai/mistral-7b-instruct:free",
            "deepseek/deepseek-r1:free",
            "qwen/qwen-2.5-72b-instruct:free"
          ],
          hasCustomKey: hasOpenRouterKey,
          isPrimary: false
        },
        {
          id: "local-rule-engine",
          name: "Deterministic Engineering Simulator",
          status: "Always Available Offline Safety Guard",
          models: ["rule-based-fast", "offline-mock"],
          isPrimary: false
        }
      ],
      routingPolicy: {
        strategy: "Gemini Priority -> OpenRouter Free LLM Fallback -> Local Engine Buffer",
        rateLimitMitigation: "Active (Exhaustion & 429 errors automatically route to OpenRouter Free tier)",
        maxRetries: 2,
        backoffDelayMs: 1000
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- Gmail Secure Alerts API -----------------

app.get("/api/gmail/messages", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }
  const token = authHeader.replace("Bearer ", "");
  const query = req.query.q as string || "";

  try {
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10${query ? `&q=${encodeURIComponent(query)}` : ""}`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!listRes.ok) {
      throw new Error(`Gmail API message list fetch failed: ${listRes.statusText}`);
    }
    
    const listData = await listRes.json() as any;
    const gmailMsgs = listData.messages || [];

    const messages = await Promise.all(
      gmailMsgs.map(async (m: any) => {
        try {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!detailRes.ok) return null;
          const detail = await detailRes.json() as any;
          
          const headers = detail.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
          const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
          const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || new Date().toISOString();
          
          const textToAnalyze = `${subject} ${detail.snippet}`.toLowerCase();
          let severity = "low";
          if (textToAnalyze.includes("fail") || textToAnalyze.includes("error") || textToAnalyze.includes("critical") || textToAnalyze.includes("warning")) {
            severity = "high";
          } else if (textToAnalyze.includes("alert") || textToAnalyze.includes("review") || textToAnalyze.includes("security")) {
            severity = "medium";
          }

          return {
            id: m.id,
            subject,
            from,
            date,
            snippet: detail.snippet || "",
            severity
          };
        } catch {
          return null;
        }
      })
    );

    res.json({ messages: messages.filter(Boolean) });
  } catch (err: any) {
    res.status(500).json({ error: err.message, messages: [] });
  }
});

app.post("/api/gmail/send", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }
  const token = authHeader.replace("Bearer ", "");
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields: to, subject, body" });
  }

  try {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const mimeParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      body
    ];
    const mimeRaw = mimeParts.join("\r\n");
    const base64SafeRaw = Buffer.from(mimeRaw).toString("base64url");

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: base64SafeRaw })
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      throw new Error(`Gmail Send API failed: ${errText}`);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- AI Studio / OpenClaw Kernel API Proxies -----------------

app.post("/api/studio/planner/plan", async (req, res) => {
  try {
    const { goal, contextFiles = [] } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }
    const taskId = kernel.stateStore.createTask(goal);
    
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "started");
    const contextStart = Date.now();
    const compiledContext = await kernel.contextBuilder.buildContext(goal, contextFiles);
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "completed", Date.now() - contextStart, { filesCount: compiledContext.files.length });
    
    const steps = await kernel.planner.createPlan(taskId, goal, compiledContext);
    
    for (const step of steps) {
      kernel.stateStore.updateStep(taskId, step.stepId, step);
    }
    
    services.systemAuditService.log("success", "api", `Aziz Studio Planner: Formulated execution plan with ${steps.length} steps for goal: ${goal.substring(0, 30)}...`);
    res.json({
      taskId,
      goal,
      steps,
      context: compiledContext,
      planner_version: kernel.planner.planner_version,
      context_policy_version: kernel.contextBuilder.context_policy_version
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/studio/context/build", async (req, res) => {
  const { query, impactedFiles = [], taskId = "context_build_task" } = req.body;
  kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "started");
  const startTime = Date.now();
  try {
    const context = await kernel.contextBuilder.buildContext(query || "security policy", impactedFiles);
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "completed", Date.now() - startTime, { filesCount: context.files.length });
    services.systemAuditService.log("success", "api", `Aziz Studio ContextBuilder: Compiled context package for query "${query}". Ratio: ${context.metrics.compressionRatio}%`);
    res.json(context);
  } catch (err: any) {
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "failed", Date.now() - startTime, { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/studio/verification/verify", async (req, res) => {
  try {
    const { taskId, filePaths = [] } = req.body;
    const result = await kernel.verificationEngine.verify(taskId || "verification_task", filePaths);
    
    const passed = result.report?.telemetry?.passedRules ?? 0;
    const total = result.report?.telemetry?.totalRules ?? 5;
    const calculatedScore = total > 0 ? Math.round((passed / total) * 100) : 100;

    services.systemAuditService.log("success", "api", `Aziz Studio Verification: Rules parsed. Status: ${result.success ? "PASSED" : "FAILED"}. Score: ${calculatedScore}`);
    res.json({
      ...result,
      score: calculatedScore
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/studio/reflection/review", async (req, res) => {
  try {
    const { taskId, goal, result, verificationReport } = req.body;
    const report = await kernel.reflectionEngine.review(taskId || "reflection_task", goal || "task_goal", result || "", verificationReport);
    services.systemAuditService.log("success", "api", `Aziz Studio Reflection: Reviewed execution outcome. Risk Level: ${report.risk_level.toUpperCase()}. Confidence: ${report.confidenceScore || report.confidence}`);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/studio/task/execute", async (req, res) => {
  try {
    const { goal, agentId } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }
    const taskId = kernel.stateStore.createTask(goal);
    
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "started");
    const contextStart = Date.now();
    const compiledContext = await kernel.contextBuilder.buildContext(goal, ["package.json"]);
    kernel.stateStore.recordTimelineEvent?.(taskId, "context building", "completed", Date.now() - contextStart, { filesCount: compiledContext.files.length });
    
    const steps = await kernel.planner.createPlan(taskId, goal, compiledContext);
    for (const step of steps) {
      kernel.stateStore.updateStep(taskId, step.stepId, step);
    }

    services.systemAuditService.log("info", "api", `Aziz Studio Task: Spanning asynchronous execution for Task ${taskId} using agent "${agentId || "default"}"`);

    kernel.agentRuntime.executeTask(taskId, agentId).catch((execErr) => {
      console.error(`Asynchronous agent execution failed internally for Task ${taskId}:`, execErr);
    });

    res.json({
      taskId,
      goal,
      status: "running",
      steps
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/studio/task/:id", (req, res) => {
  const task = kernel.stateStore.getTaskState(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  const execStatus = kernel.agentRuntime.getExecutionStatus(req.params.id);
  res.json({
    ...task,
    activeStatus: execStatus || task.status
  });
});

app.get("/api/studio/tasks", (req, res) => {
  res.json({ tasks: kernel.stateStore.listTasks() });
});

app.get("/api/studio/telemetry", (req, res) => {
  const runtimeTelemetry = kernel.agentRuntime.getTelemetry();
  const tasks = kernel.stateStore.listTasks();
  
  let totalTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;
  const toolCounts: Record<string, number> = {};

  for (const t of tasks) {
    totalTokens += t.telemetry.tokensUsed || 0;
    totalCost += t.telemetry.costInUSD || 0;
    totalDuration += t.telemetry.durationMs || 0;
    for (const [tool, count] of Object.entries(t.telemetry.toolInvocations || {})) {
      toolCounts[tool] = (toolCounts[tool] || 0) + count;
    }
  }

  res.json({
    runtime: runtimeTelemetry,
    aggregated: {
      totalTokens: totalTokens || runtimeTelemetry.tokensConsumed,
      totalCost: totalCost || runtimeTelemetry.costInUSD,
      totalDuration: totalDuration || runtimeTelemetry.totalDurationMs,
      toolCounts
    },
    metrics: {
      averageLatencyMs: metricsStore.totalRequests > 0 ? Math.round(metricsStore.totalLatencyMs / metricsStore.totalRequests) : 0,
      successRatePercent: metricsStore.totalTasks > 0 ? Math.round((metricsStore.successfulTasks / metricsStore.totalTasks) * 100) : 100,
      retryRate: metricsStore.totalRequests > 0 ? parseFloat((metricsStore.totalRetries / metricsStore.totalRequests).toFixed(4)) : 0,
      providerUsage: metricsStore.providerUsage,
      estimatedCostUSD: parseFloat(metricsStore.estimatedCostUSD.toFixed(6))
    }
  });
});

app.get("/api/studio/tools", (req, res) => {
  res.json({ tools: kernel.toolRegistry.listTools() });
});

app.get("/api/studio/agents", (req, res) => {
  res.json({ agents: kernel.agentRuntime.listAgents() });
});

// Operational Metrics Store & Subscription (kernel model event listener)
const metricsStore = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalRetries: 0,
  totalLatencyMs: 0,
  estimatedCostUSD: 0,
  providerUsage: {} as Record<string, number>,
  totalTasks: 0,
  successfulTasks: 0,
  failedTasks: 0,
  totalTaskDurationMs: 0
};

kernel.eventBus.subscribe("*", (event) => {
  const taskId = event.taskId;

  if (event.type === "ModelRequestCompleted") {
    metricsStore.totalRequests++;
    metricsStore.successfulRequests++;
    metricsStore.totalRetries += event.payload.retries || 0;
    metricsStore.estimatedCostUSD += event.payload.costUSD || 0;
    metricsStore.totalLatencyMs += event.payload.latencyMs || 0;
    
    const provider = event.payload.selectedProvider || "unknown";
    metricsStore.providerUsage[provider] = (metricsStore.providerUsage[provider] || 0) + 1;
  } else if (event.type === "ModelRequestFailed") {
    metricsStore.totalRequests++;
    metricsStore.failedRequests++;
  } else if (event.type === "TaskCompleted") {
    metricsStore.totalTasks++;
    if (event.payload.success) {
      metricsStore.successfulTasks++;
    } else {
      metricsStore.failedTasks++;
    }
    
    const state = kernel.stateStore.getTaskState(event.taskId);
    if (state) {
      metricsStore.totalTaskDurationMs += state.telemetry.durationMs || 0;
    }
  }

  if (taskId && taskId !== "SYSTEM" && taskId !== "verification_task" && taskId !== "reflection_task") {
    if (event.type === "PlanningStarted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "planning", "started");
    } else if (event.type === "PlanningCompleted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "planning", "completed", undefined, { stepsCount: event.payload.stepsCount });
    } else if (event.type === "ModelRequestStarted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "routing", "started", undefined, { policy: event.payload.policy });
    } else if (event.type === "ModelRequestCompleted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "routing", "completed", event.payload.latencyMs, { selectedProvider: event.payload.selectedProvider, selectedModel: event.payload.selectedModel });
    } else if (event.type === "VerificationStarted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "verification", "started");
    } else if (event.type === "VerificationPassed") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "verification", "completed", event.payload.durationMs, { score: 100 });
    } else if (event.type === "VerificationFailed") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "verification", "failed", event.payload.durationMs, { errors: event.payload.reportSummary });
    } else if (event.type === "ReflectionCompleted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "reflection", event.payload.passed ? "completed" : "failed", event.payload.durationMs, { passed: event.payload.passed, confidence: event.payload.confidence });
    } else if (event.type === "TaskCompleted") {
      kernel.stateStore.recordTimelineEvent?.(taskId, "completion", event.payload.success ? "completed" : "failed", undefined, { error: event.payload.error });
    }
  }
});

// ----------------- Employment Intelligence Platform V2 API -----------------

app.get("/api/employment/v2/history", async (req, res) => {
  try {
    const history = await services.employmentV2Service.getSearchHistory();
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/history/notes", async (req, res) => {
  const { id, notes } = req.body;
  if (!id) return res.status(400).json({ error: "Missing entry id" });
  try {
    const updated = await services.employmentV2Service.updateSearchHistoryNotes(id, notes || "");
    res.json({ success: true, entry: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/history", async (req, res) => {
  try {
    await services.employmentV2Service.clearSearchHistory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/saved", async (req, res) => {
  try {
    const saved = await services.employmentV2Service.getSavedJobs();
    res.json({ saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/saved", async (req, res) => {
  const { job, status, categories, notes } = req.body;
  if (!job) return res.status(400).json({ error: "Job is required" });
  try {
    const entry = await services.employmentV2Service.saveJob(job, status, categories, notes);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/saved/:id", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.updateSavedJob(req.params.id, req.body);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/saved/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.removeSavedJob(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/collections", async (req, res) => {
  try {
    const collections = await services.employmentV2Service.getJobCollections();
    res.json({ collections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/applications", async (req, res) => {
  try {
    const applications = await services.employmentV2Service.getApplications();
    res.json({ applications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/applications", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.addApplication(req.body);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/applications/:id", async (req, res) => {
  const { currentStatus, notes } = req.body;
  try {
    const entry = await services.employmentV2Service.updateApplicationStatus(req.params.id, currentStatus, notes);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/applications/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.deleteApplication(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/interviews", async (req, res) => {
  try {
    const interviews = await services.employmentV2Service.getInterviewStages();
    res.json({ interviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/interviews", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.addInterviewStage(req.body);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/interviews/:id", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.updateInterviewStage(req.params.id, req.body);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/interviews/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.deleteInterviewStage(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/followups", async (req, res) => {
  try {
    const followups = await services.employmentV2Service.getFollowups();
    res.json({ followups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/followups", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.addFollowup(req.body);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/followups/:id", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.updateFollowup(req.params.id, req.body);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/followups/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.deleteFollowup(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/companies", async (req, res) => {
  try {
    const companies = await services.employmentV2Service.getCompanies();
    res.json({ companies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/companies", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.addCompany(req.body);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/companies/:id", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.updateCompany(req.params.id, req.body);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/companies/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.deleteCompany(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/recruiters", async (req, res) => {
  try {
    const recruiters = await services.employmentV2Service.getRecruiters();
    res.json({ recruiters });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/recruiters", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.addRecruiter(req.body);
    res.status(201).json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employment/v2/recruiters/:id", async (req, res) => {
  try {
    const entry = await services.employmentV2Service.updateRecruiter(req.params.id, req.body);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employment/v2/recruiters/:id", async (req, res) => {
  try {
    const success = await services.employmentV2Service.deleteRecruiter(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employment/v2/opportunity-score", async (req, res) => {
  const { job, profile } = req.body;
  if (!job) return res.status(400).json({ error: "Job object is required." });
  try {
    const breakdown = await services.employmentV2Service.calculateOpportunityScore(job, profile);
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employment/v2/analytics", async (req, res) => {
  try {
    const analytics = await services.employmentV2Service.getSearchAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- General Health & Diagnostics API -----------------

app.get("/api/health", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: "ok",
    kernel_version: "1.0.0-frozen",
    contract_version: "v1.0-frozen",
    active_provider: isProduction ? "gemini-provider" : (hasGeminiKey ? "gemini-provider" : "mock-fast"),
    provider_status: hasGeminiKey ? "real" : "mock",
    build_version: "build-20260711-rev1",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/studio/metrics", (req, res) => {
  const avgLatency = metricsStore.totalRequests > 0 
    ? Math.round(metricsStore.totalLatencyMs / metricsStore.totalRequests) 
    : 0;
  const successRate = metricsStore.totalTasks > 0 
    ? Math.round((metricsStore.successfulTasks / metricsStore.totalTasks) * 100) 
    : 100;
  const retryRate = metricsStore.totalRequests > 0 
    ? parseFloat((metricsStore.totalRetries / metricsStore.totalRequests).toFixed(4)) 
    : 0;

  res.json({
    averageLatencyMs: avgLatency,
    successRatePercent: successRate,
    retryRate: retryRate,
    providerUsage: metricsStore.providerUsage,
    estimatedCostUSD: parseFloat(metricsStore.estimatedCostUSD.toFixed(6)),
    counters: {
      totalRequests: metricsStore.totalRequests,
      successfulRequests: metricsStore.successfulRequests,
      failedRequests: metricsStore.failedRequests,
      totalRetries: metricsStore.totalRetries,
      totalTasks: metricsStore.totalTasks,
      successfulTasks: metricsStore.successfulTasks,
      failedTasks: metricsStore.failedTasks
    }
  });
});

// ----------------- Module Lifecycle Platform Engine API -----------------

// Gathers active modules metadata, health, and configuration schemas
app.get("/api/modules", async (req, res) => {
  try {
    const manager = ModuleManager.getInstance();
    const modules = manager.getModules().map((m) => ({
      id: m.metadata.id,
      name: m.metadata.name,
      version: m.metadata.version,
      description: m.metadata.description,
      author: m.metadata.author,
      state: m.state,
      health: m.health,
      capabilities: m.metadata.capabilities,
      dependencies: m.metadata.dependencies,
      configSchema: m.metadata.configSchema || {},
      requiredServices: m.metadata.requiredServices || [],
      optionalServices: m.metadata.optionalServices || [],
    }));
    res.json({ modules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full structural, relational dependency and status diagnostics
app.get("/api/modules/diagnostics", async (req, res) => {
  try {
    const manager = ModuleManager.getInstance();
    const diagnostics = await manager.getDiagnosticsReport();
    const capabilities = manager.getCapabilitiesRegistry();
    res.json({
      ...diagnostics,
      capabilities,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disables a registered module at runtime
app.post("/api/modules/:id/disable", async (req, res) => {
  const { id } = req.params;
  try {
    const manager = ModuleManager.getInstance();
    await manager.disableModule(id);
    res.json({ success: true, message: `Module '${id}' has been disabled.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Enables and starts a disabled module at runtime
app.post("/api/modules/:id/enable", async (req, res) => {
  const { id } = req.params;
  try {
    const manager = ModuleManager.getInstance();
    await manager.enableModule(id, services);
    res.json({ success: true, message: `Module '${id}' has been enabled.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reloads runtime configuration schema parameters
app.post("/api/modules/:id/reload", async (req, res) => {
  const { id } = req.params;
  const { config } = req.body;
  try {
    const manager = ModuleManager.getInstance();
    await manager.reloadModule(id, config || {});
    res.json({ success: true, message: `Module '${id}' configuration reloaded.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Restarts a module (Shutdown and then Startup)
app.post("/api/modules/:id/restart", async (req, res) => {
  const { id } = req.params;
  try {
    const manager = ModuleManager.getInstance();
    const module = manager.getModule(id);
    if (!module) {
      return res.status(404).json({ error: `Module '${id}' not found.` });
    }
    await module.onShutdown();
    await module.onStartup(services);
    res.json({ success: true, message: `Module '${id}' restarted successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- Vite Dev / Static Production Serving Middleware -----------------

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Aziz Personal assistant Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
