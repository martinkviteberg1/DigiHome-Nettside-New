const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  // Emulate a mobile viewport similar to Lighthouse moto g
  await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });

  await page.evaluateOnNewDocument(() => {
    window.__lcp = null;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      const el = last.element;
      window.__lcp = {
        time: Math.round(last.startTime),
        size: Math.round(last.size),
        url: last.url || null,
        tag: el ? el.tagName : null,
        cls: el ? (el.className && el.className.toString ? el.className.toString().slice(0, 80) : '') : null,
        text: el ? (el.innerText || '').slice(0, 60) : null,
        rect: el ? (() => { const r = el.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })() : null,
      };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const lcp = await page.evaluate(() => window.__lcp);
  console.log('LCP ELEMENT:', JSON.stringify(lcp, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
