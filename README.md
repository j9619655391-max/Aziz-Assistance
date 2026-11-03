# 🛡️ Aziz Personal Assistant (DevOps & SecOps Intelligent SRE Workspace)

Aziz Personal Assistant is a state-of-the-art, secure, full-stack platform that combines an autonomous systems administrator with a private, sandboxed terminal, credential-safe memory storage, and real-time security scanning pipelines. 

Designed for engineers and DevOps professionals, the platform delivers zero-trust system state auditing, integrated Google OAuth Workspace alerts, and an active job intelligence daemon.

---

## 🏗️ Core Architectural Modules

The platform is split into key functional domains. For a comprehensive, CTO-level view of our system design, schemas, and visionary roadmap, refer directly to our official documentation:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Specifications on block designs, folder trees, custom static diagnostic engines, database schemas, and multi-model LLM failover policies.
- **[ROADMAP.md](./ROADMAP.md)**: Full compliance feature audits, target positioning comparisons (with Cursor, Cline, Claude Code), and phased engineering release targets.

---

### 1. **Zero-Trust Security-First Terminal (`/api/terminal/execute`)**
- **Safe Sandboxed Execution:** Simulates standard Unix-like shell environments including `lsof`, `iptables`, `system-info`, `ls`, and `cat`.
- **Active Guard Rails:** Implements continuous regex threat-interception. Destructive commands (e.g., `rm -rf`, `sudo`, `mkfs`, raw block writes) are captured and blocked instantly.
- **Sensitive Key Redaction:** Real-time stream filters automatically scrub and replace passwords, API tokens, and secret strings with `[REDACTED_SENSITIVE_DATA]`.

### 2. **Durable Memory Vault (`/api/memories`)**
- **State Persistence:** Preserves long-term developer configurations, security hardening rules, language preferences, and personal contexts.
- **Strict Ingestion Policies:** Strictly rejects passwords, stripe keys, OTPs, or private keys before writing to the memory registry to maintain top-tier database integrity.

### 3. **Autonomous Job Scan Daemon (`/api/alerts/*`)**
- **Automated Sweeping:** Executes automated background matching against global tech listings every 3 minutes.
- **Dynamic Profile Matching:** Matches technical preferences, visa sponsorship desires, and experienced languages (e.g., Kubernetes, TypeScript) to locate compatible high-grade roles.
- **Real-Time Log Stream:** Feeds real-time progress updates directly to the administrative panel.

### 4. **Unified System Audit Logs Console (`/api/logs`)**
- **Contextual Transaction Logging:** Monitors all server events including HTTP API routing latency, database updates, security scans, background interval dispatches, and LLM chat completions.
- **Real-Time Poller:** Features a high-fidelity client feed displaying color-coded events matched to severity (`INFO`, `WARN`, `ERROR`, `SUCCESS`) and module origin (`API`, `DAEMON`, `SECURITY`, `DATABASE`, `AI`).

---

## 🛠️ Tech Stack & Deployment

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, and Motion transitions.
- **Backend:** Node.js, Express, tsx (for runtime type compilation), and Esbuild (for production-grade bundled server deployment).
- **AI Integrations:** Modern `@google/genai` TypeScript SDK utilizing the powerful `gemini-3.5-flash` model.

### Environment Setup
Create a `.env` file in the root workspace (using `.env.example` as a guideline):
```env
# Gemini API Access
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

### Script Actions
- **Development Mode:** Runs typescript-supported Express server concurrently with Vite asset processing.
  ```bash
  npm run dev
  ```
- **Build Phase:** Bundles client static files and packs the server code into a self-contained CommonJS production bundle at `dist/server.cjs`.
  ```bash
  npm run build
  ```
- **Start Production:** Launches the compiled server on port `3000`.
  ```bash
  npm start
  ```

---

## 🛡️ DevOps Hardening Checklists

- [x] **Least Privilege Context:** Ensure that Node.js containers run as non-root users.
- [x] **Secure Inputs:** Filter out and censor command injections or path-traversal inputs (`..` blocks).
- [x] **Dynamic Real-Time Auditing:** Provide live metrics on system grade security posture (0-100 score).
- [x] **Encrypted Sync Feed:** Enable granular tracking on database storage states and memory deletions.
