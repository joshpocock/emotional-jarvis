// Jarvis's eyes on the web: opens a real, visible Chrome window, reads the page, then closes it.
// Needs the browser once: npx playwright install chromium
import { chromium } from "playwright";

export async function readWebsite(url: string): Promise<string> {
  // You watch it work: a real window, scrolling through the page while Jarvis reads it.
  const browser = await chromium.launch({ headless: process.env.JARVIS_HEADLESS === "1" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
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
