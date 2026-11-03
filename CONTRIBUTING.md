# 🤝 Contributing to Aziz AI Platform

Welcome! We are excited that you want to contribute to the **Aziz AI Platform** (encompassing **Aziz Studio** and **Aziz Kernel**). This guide outlines the setup instructions, coding standards, and strict governance rules required of all contributors.

---

## ❄️ The Frozen Kernel Directive

As of **v1.0 Release Candidate 1 (RC1)**, the core architecture of the **Aziz Kernel** is **officially frozen**. 

* **Where the Kernel Lives:** `/src/kernel/` (encompassing `AgentRuntime`, `Planner`, `StateStore`, `EventBus`, `ModelRouter`, `ContextBuilder`, `VerificationEngine`, `ReflectionEngine`, and `ToolRegistry`).
* **The Rule:** **No new Kernel features or structural architectural changes are permitted.** 
* **Allowed Kernel Changes:** Contributions inside `/src/kernel/` are strictly limited to critical security patches, operational bug fixes, or stability enhancements.
* **Core Focus Area:** Contributions should focus on **Aziz Studio UI**, usability improvements, performance tuning, operational stability, and addressing user feedback.

---

## 💻 Local Development Setup Guide

### 1. Prerequisites
* **Node.js:** v18.0.0 or higher (v22+ recommended)
* **NPM:** v10.0.0 or higher
* **Git:** For code management and SRE checkpoint rollback tests.

### 2. Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/aziz-platform.git
   cd aziz-platform
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
4. Populate your `.env` with required credentials (such as `GEMINI_API_KEY`). Ensure server secrets do **not** use the `VITE_` prefix to prevent browser-side leakage.

### 3. Execution Commands
* **Run Development Server:**
  ```bash
  npm run dev
  ```
  *Boots Express backend and Vite client proxy middleware on `http://localhost:3000` via `tsx`.*
* **Run Code Quality Linter:**
  ```bash
  npm run lint
  ```
  *Runs static type checks via `tsc --noEmit`.*
* **Build App for Production:**
  ```bash
  npm run build
  ```
  *Compiles Vite SPA to static files in `dist/` and compiles Express `server.ts` into a unified CommonJS file `dist/server.cjs` via esbuild.*
* **Start Production Server:**
  ```bash
  npm start
  ```
  *Launches the pre-compiled server from `dist/server.cjs` on port 3000.*

---

## 🎨 Coding Standards & Guardrails

To maintain codebase health and satisfy compilation/linting gates, all code submissions must adhere to these policies:

### TypeScript & Strict Typing
* Place all `import` statements at the top level of modules.
* Use **named imports**; do not use object destructuring.
* Enforce type safety; avoid using loose `any` types.
* Declare standard enums; do **not** use `const enum`.

### Presentation, Layout & CSS
* **Tailwind CSS:** Use Tailwind CSS utility classes directly for styling.
* **No Custom CSS:** Do not create separate `.css` files. Custom styles must be defined inside tailwind classes or the global `@import "tailwindcss";` stylesheet.
* **Fluid Boundaries:** Use responsive prefixes (`sm:`, `md:`, `lg:`) and keep layouts fluid via standard wrappers (e.g., `w-full max-w-7xl mx-auto`).
* **Touch Targets:** Interactive targets must be at least `44px` on mobile layouts.

### Library Restrictions
* **Iconography:** All icons **MUST** be imported from `lucide-react`. Do not write custom inline SVGs.
* **Animations:** All transitions and interactive animations must use `motion` imported from `motion/react`.

---

## 🚀 Pull Request & Release Process

We follow a structured Release Candidate (RC) flow to transition from validation to General Availability.

1. **Create an Issue & Branch:** Open an issue discussing your fix or UX adjustment first. Create a clean topic branch (e.g., `fix/studio-log-redaction`).
2. **Implement and Self-Audit:**
   * Write your fix/change.
   * Run `npm run lint` and `npm run build` locally. If either command throws errors, the PR will be automatically rejected.
3. **Commit Messages:** Use standard imperative style (e.g., `fix: resolve task log clipping on narrow displays`).
4. **Submit PR:** Target your pull request to the active release branch (`release/v1.0-rc1`).
5. **The DoD (Definition of Done) Validation Gate:**
   * Your PR will be evaluated through our live compilation suite.
   * Changes must maintain zero unresolved linter flags.
   * The Aziz Kernel's internal `VerificationEngine` will simulate task executions over modified assets to ensure runtime regressions are not introduced.
