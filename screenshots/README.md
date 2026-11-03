# Screenshots Directory Status
**Environment Constraint Notice**:
Headless browser automation drivers (such as Playwright, Puppeteer, or Selenium) with display server framebuffers (Xvfb/Chromium) are NOT pre-installed in this sandboxed Cloud Run container environment.

Consequently, automated PNG/JPEG screenshot captures cannot be generated programmatically via CLI. Visual verification must be performed by opening the live application preview iframe at:
- **Development App URL**: https://ais-dev-dus6yrg377w5t3srwnsdsy-142754613633.asia-east1.run.app
- **Shared App URL**: https://ais-pre-dus6yrg377w5t3srwnsdsy-142754613633.asia-east1.run.app
