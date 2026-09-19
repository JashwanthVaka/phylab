// Playwright is a dev-only dependency. KINETIQ itself still ships with no
// runtime dependencies, and Chromium is whatever the machine already provides.
import { defineConfig } from '@playwright/test';

const defaultChromiumPath = process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: process.env.KINETIQ_URL || 'http://127.0.0.1:3000',
    trace: 'off',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || defaultChromiumPath }
  }
});
