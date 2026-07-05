import fs from 'fs';
import path from 'path';

// /llms.txt for AI-crawlere (AEO). Serveres som app-route fordi /public IKKE
// følger med standalone-bygget i produksjon (ga 404 på digihome.no/llms.txt).
// Selve innholdet ligger i /lib/llms-content.txt og traces inn i bygget via
// outputFileTracingIncludes i next.config.js.
export const dynamic = 'force-static';

export async function GET() {
  const file = path.join(process.cwd(), 'lib', 'llms-content.txt');
  const txt = fs.readFileSync(file, 'utf8');
  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
