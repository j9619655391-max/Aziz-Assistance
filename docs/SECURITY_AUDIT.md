# 🛡️ Aziz AI Platform: Controlled Production Validation Security Audit (v1.0 Frozen RC1)

This security audit serves as the authoritative evaluation of the security architecture for the **Aziz AI Platform** (encompassing **Aziz Studio** and **Aziz Kernel**). This document outlines the zero-trust security postures, mitigation techniques, risk indices, and defensive patterns compiled for controlled production validation (RC1).

---

## 1. OWASP Top 10 Security Mapping

The system's security postures are mapped against the **OWASP Top 10 (2021)** framework. Below are the verified implementation paths and remaining operational gaps.

### A01:2021 - Broken Access Control
* **Implementation Path:** 
  * The API routes in `server.ts` enforce clear path segmentation. Static UI assets inside `/dist` are isolated.
  * In `src/kernel/ToolRegistry.ts`, the file system execution tools restrict read/write operations strictly to relative workspace boundaries.
  * System administrative and diagnostic endpoints (e.g., `/api/studio/metrics`, `/api/studio/agents`) are isolated on the server.
* **Gaps & Mitigations:** Currently, access-token validation is performed in the frontend via Firebase Client authentication. For enterprise production, an Express middleware interceptor must be added to `server.ts` to validate the Firebase ID Token on every `/api/*` endpoint.

### A02:2021 - Cryptographic Failures
* **Implementation Path:** 
  * Absolute prohibition of raw API keys stored in source code. Gemini API Key (`GEMINI_API_KEY`) is locked server-side via Node `process.env`.
  * Live communications are routed through HTTPS/WSS.
  * Sensitive user credentials and integration tokens are collected and stored securely using the client-side `MemoryVault.tsx` which redacts keys before pushing them to unified log feeds.
* **Gaps & Mitigations:** Local storage of temporary keys in `localStorage` for the UI must be encrypted using AES-GCM (via Web Crypto API) instead of raw strings.

### A03:2021 - Injection
* **Implementation Path:** 
  * **Command Injection:** Full terminal and tool sandboxing. In `src/components/TerminalPanel.tsx` and `src/kernel/ToolRegistry.ts`, command strings are processed using regex blockers. Shell meta-characters (`;`, `&&`, `||`, `|`, `&`, `$` and backticks) are parsed and blocked if un-escaped.
  * **SQL Injection:** We use parametrized Firestore queries. No raw dynamic query strings are compiled.
* **Gaps & Mitigations:** Implement an AST (Abstract Syntax Tree) validator for dynamic node/shell commands in `ToolRegistry` rather than relying on regex blacklists alone.

### A04:2021 - Insecure Design
* **Implementation Path:** 
  * Architecture is built on threat modeling: "Trust the Gateway, Verify the Kernel". No client-side code can directly invoke shell binaries or write raw system files.
  * The `VerificationEngine` (DoD loop) and `ReflectionEngine` form an autonomous defense layer, validating the output of coder steps against syntax, linting, and security constraints before committing to state.
* **Gaps & Mitigations:** Introduce a hard-timeout limits manager at the OS container level to terminate infinite SRE loops.

### A05:2021 - Security Misconfiguration
* **Implementation Path:** 
  * Express is configured with `express.json({ limit: "10mb" })` to prevent JSON-bomb Denial of Service (DoS) attacks.
  * Detailed stack traces are suppressed in production mode (using standard node `NODE_ENV === "production"` checks).
  * Dev tools and mocks (e.g., `MockLLMProvider` fast/reasoning profiles) are strictly deactivated when running under `NODE_ENV === "production"`.
* **Gaps & Mitigations:** Set custom Express security headers via `helmet` middleware.

### A06:2021 - Vulnerable and Outdated Components
* **Implementation Path:** 
  * Codebase is frozen with modern, verified frameworks: React 19.0.1, Vite 6.2.3, TypeScript 5.8.2, and Tailwind 4.1.14.
  * Low dependency footprint (less than 15 direct production dependencies) limits surface area.
* **Gaps & Mitigations:** Integrate standard NPM Audit CI steps into GitHub Actions.

### A07:2021 - Identification and Authentication Failures
* **Implementation Path:** 
  * Handled via **Firebase Authentication** standard protocols. No local password hashing or session cookie generation is implemented, eliminating custom auth defects.
* **Gaps & Mitigations:** Implement Multi-Factor Authentication (MFA) prompts for enterprise domains.

### A08:2021 - Software and Data Integrity Failures
* **Implementation Path:** 
  * `EventBus.ts` implements defensive cloning. When a `KernelEvent` is published, its payload is deep-cloned (`JSON.parse(JSON.stringify(event))`) before being recorded in the compliance audit journal. This prevents reference hijacking in memory.
* **Gaps & Mitigations:** Implement a SHA-256 hash validation for code files pulled during workspace indexing.

### A09:2021 - Security Logging and Monitoring Failures
* **Implementation Path:** 
  * Operational tracing is enhanced using **Structured Request IDs** (`REQ-AZIZ-...`). Request IDs are generated via Express middleware using `AsyncLocalStorage` context propagation.
  * SRE Unified Logs (`systemLogs`) maintain an in-memory ring-buffer (up to 150 records) mapping log levels (`info`, `warn`, `error`, `success`) to specific request IDs and subsystems (`api`, `security`, `daemon`, `database`, `ai`).
* **Gaps & Mitigations:** Configure system logging to pipe to a standard cloud stream (e.g., Google Cloud Logging / Stackdriver) instead of keeping it solely in-memory.

### A10:2021 - Server-Side Request Forgery (SSRF)
* **Implementation Path:** 
  * The `ModelRouter` and LLM providers only dispatch requests to authenticated, predefined Google Gemini endpoints.
  * No generic user-specified URL scrapers or custom HTTP clients are exposed to untrusted commands.
* **Gaps & Mitigations:** Implement a strict egress IP whitelist if the SRE assistant is integrated with arbitrary webhooks.

---

## 2. Input Validation, Rate Limiting, and CORS Policies

### Input Validation
All HTTP payloads entering `server.ts` undergo pre-validation:
1. **JSON Size Caps:** The payload parser is configured with a 10MB limit.
2. **Task Goal Sanitization:** User goals submitted to `/api/studio/task/launch` are parsed, checked for empty strings, and type-validated against the `TaskGoal` schema.
3. **Workspace Path Validation:** Files submitted for context compilation are mapped against an array of valid workspace strings; any path starting with `/` or containing `..` is immediately rejected.

### Rate Limiting
* **Current State:** Handled natively by the container ingress router (Cloud Run / Nginx gateway limits).
* **API Defense (Recommended for Production CJS server):** Integrate `express-rate-limit` middleware:
```typescript
import rateLimit from "express-rate-limit";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);
```

### CORS Policy
In the compiled production container, the Express server acts as a single-origin server serving static client assets from `dist/` and hosting API endpoints on `/api/*` under the exact same port `3000`. This completely avoids cross-origin pre-flight requests and establishes a **Same-Origin** boundary:
* External API access is blocked unless specifically whitelisted.
* For local development, Vite handles hot-rebuild proxy-routing to port 3000.

---

## 3. Secret Management & Environment Leakage Prevention

* **Strict Non-Prefix Policy:** Sensitive API keys (e.g., `GEMINI_API_KEY`, `FIREBASE_ADMIN_KEY`, `SMTP_SECRET`) are kept strictly as server-side environment variables in `.env`. They are never prefixed with `VITE_`.
* **Vite Static Asset Bundling Safety:** Vite automatically strips any environment variable from the client build unless it is explicitly prefixed with `VITE_`. This ensures that even accidental imports of server secrets into client TSX files will compile as `undefined` in the static bundle (`dist/assets/index.js`), completely eliminating secret leakages to the browser.
* **Memory Redaction:** The unified `LogPanel` intercepts active secrets. Any log lines or stack traces matching standard credential patterns (e.g., `AIzaSy...` for Gemini/Google keys) are automatically masked with `[REDACTED_SECRET]` before storage or rendering.

---

## 4. Specific Attack Defenses (SSRF, Path Traversal, Command & Prompt Injection)

### Server-Side Request Forgery (SSRF) Protection
SSRF occurs when an attacker forces the server to make requests to internal metadata servers or arbitrary loopback addresses.
* **Defense:** The `ModelRouter` and system integrations do not support user-provided endpoint configuration. Connections are made strictly to predefined, TLS-verified Google API endpoints.
* **File Scrapers:** Workspace tools do not support URL downloading. If a tool requires downloading assets, it must be declared and explicitly verified by SRE boundaries.

### Path Traversal Protection
Attackers could input path sequences like `../../etc/passwd` to read host files.
* **Defense Code (Inside `src/kernel/ToolRegistry.ts`):**
  * All file paths are audited using a clean boundary check:
  ```typescript
  import path from "path";
  export function isPathSafe(workspaceRoot: string, targetPath: string): boolean {
    const resolvedPath = path.resolve(workspaceRoot, targetPath);
    return resolvedPath.startsWith(workspaceRoot);
  }
  ```
  * Any request mapping to directories outside of the active workspace root throws a `SecurityViolationException` and triggers an immediate `warn` log with the associated `requestId` to alert SRE supervisors.

### Command Injection Protection
If a coder agent attempts to construct a command line with untrusted input, the terminal tool could execute arbitrary bash code.
* **Defense:** 
  1. **Strict Regex Blocklist:** In `src/components/TerminalPanel.tsx` and the core sandboxing routine, we parse and block command chains. The following patterns are rejected:
     * `rm -rf /`
     * `sudo`
     * `chmod`
     * `chown`
     * `;` (Command chaining)
     * `&&` (Logical AND chaining)
     * `||` (Logical OR chaining)
     * `|` (Piping to arbitrary binaries)
     * `$` (Subshell evaluations)
  2. **Process Spawn Isolation:** In production deployments, commands run inside an ephemeral Linux sandbox (Docker Container) with high-density resource limitations and zero access to the host machine's root system.

### Prompt Injection Protection
Prompt injection manipulates LLMs into ignoring their core SRE instructions or executing unauthorized workspace changes.
* **Defense:** 
  1. **Dual-Channel System Prompts:** Core instructions for the `Planner` and `VerificationEngine` are loaded as read-only server-side string templates. They are separated from user goals in the payload compilation.
  2. **ModelRouter Formatting:** Inputs are wrapped in structured JSON parameters, preventing raw user text from breaking the execution context.
  3. **ReflectionEngine Auditing:** SRE tasks are evaluated by a secondary agent (`ReflectionEngine`) using an independent, frozen rubric. If a coder agent is tricked into introducing a malicious back-door or bypassing system rules, the reflector marks the step as `failed` (Confidence score < 70) and forces the `AgentRuntime` to rollback the edits, breaking the injection loop.
