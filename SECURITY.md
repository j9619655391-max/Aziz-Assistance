# 🛡️ Security Policy

## Supported Versions

We actively provide security patches and updates for the following versions of the **Aziz AI Platform**:

| Version | Supported | Notes |
| :--- | :---: | :--- |
| **v1.0.0-rc1 (Frozen RC1)** | Yes | Current active branch for controlled production validation. |
| **v0.9.x** | No | Legacy preview builds. Please upgrade to RC1. |

---

## Reporting a Vulnerability

We take the security of the Aziz AI Platform seriously. If you discover a security vulnerability, we strongly encourage you to report it immediately.

**Please do NOT open public GitHub issues for security vulnerabilities.**

Instead, please report vulnerabilities by following these steps:
1. Email your findings directly to the Security Response Team at **security@aziz-platform.org**.
2. Include a detailed description of the vulnerability, steps to reproduce, and any proof-of-concept (PoC) code or screenshots.
3. If applicable, note if the vulnerability affects the core **Aziz Kernel** or the user-facing **Aziz Studio** interface.

### Response Timeline
* **Acknowledgement:** You will receive an automated receipt acknowledgement within **24 hours**.
* **Triage & Evaluation:** Our team will review the report and provide a status update or request for clarification within **48 hours**.
* **Remediation & Patching:** Once validated, a patch will be prepared and backported to active release branches. We aim to resolve critical issues within **7 days** of disclosure.

---

## Controlled Validation & Audit Policies

As of v1.0 Frozen RC1, the following operational security postures are enforced:
* **The Kernel Freeze:** Direct file-system, terminal, or network access tools are tightly sandboxed within `src/kernel/ToolRegistry.ts` using strict pattern-blocking.
* **Secrets Handling:** Server-side API credentials (such as `GEMINI_API_KEY`) must never be hardcoded or prefixed with `VITE_`.
* **External Audits:** Before general availability (v1.0 GA), an independent third-party code audit will be executed to supplement our internal OWASP Top 10 mappings.
