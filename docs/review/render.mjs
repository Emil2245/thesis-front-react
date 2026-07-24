import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const jobs = [
  {
    html: "review.html",
    pdf: "APU-Frontend-Review.pdf",
    title: "Sistema APU · Frontend — Documentation Review",
  },
];

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const job of jobs) {
    const htmlPath = resolve(__dirname, job.html);
    const pdfPath = resolve(__dirname, job.pdf);
    const url = pathToFileURL(htmlPath).href;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "20mm", left: "16mm" },
      displayHeaderFooter: false,
    });
    const bytes = readFileSync(pdfPath).length;
    console.log(`wrote ${pdfPath} (${(bytes / 1024).toFixed(1)} KB)`);
  }
} finally {
  await browser.close();
}
