// Jarvis's eyes on the web: opens a real, visible Chrome window, reads the page, then closes it.
// Needs the browser once: npx playwright install chromium
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { chromium } from "playwright";

// Loopback, private, link-local and other addresses that are never a company's public website.
function isPrivateIp(ip: string) {
  const v4 = ip.replace(/^::ffff:/i, "");
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

// Only public http(s) sites: never file://, localhost or the owner's network, where a page could steer
// Jarvis into reading .env.local or a local service.
function publicHost(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (isIP(host) && isPrivateIp(host)) return null;
  return host;
}

export async function assertPublicUrl(url: string) {
  const host = publicHost(url);
  if (!host) throw new Error("only public http(s) websites can be researched");
  if (!isIP(host)) {
    const addresses = await lookup(host, { all: true });
    if (addresses.some((a) => isPrivateIp(a.address))) throw new Error("that site points at a private address");
  }
}

export async function readWebsite(url: string): Promise<string> {
  await assertPublicUrl(url);
  // You watch it work: a real window, scrolling through the page while Jarvis reads it.
  const browser = await chromium.launch({ headless: process.env.JARVIS_HEADLESS === "1" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    // The page and everything it loads stay on public hosts too.
    await page.route("**/*", (route) => (publicHost(route.request().url()) ? route.continue() : route.abort()));
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // A redirect can land somewhere the route check never saw.
    await assertPublicUrl(page.url());
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(600);
    }
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText);
    return `${title}\n\n${text.replace(/\s+\n/g, "\n").slice(0, 8000)}`;
  } finally {
    await browser.close();
  }
}
