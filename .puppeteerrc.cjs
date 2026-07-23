const { join } = require('node:path')

// Keep Puppeteer's Chromium inside node_modules/.cache so it is carried by
// Vercel's node_modules build cache (survives installs where the postinstall
// download is skipped on a cache hit). Prerender runs at build time only.
module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
}
