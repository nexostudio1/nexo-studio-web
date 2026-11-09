// node fotos.mjs <prefijo> <f,f,...> [escala]  — un bundle, un navegador, varias fotos
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const chromiumOptions = { gl: "swangle" };
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const puppeteerInstance = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "Renuncia", chromiumOptions, puppeteerInstance });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), chromiumOptions, puppeteerInstance, timeoutInMilliseconds: 240000,
    onBrowserLog: (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); } });
  console.log("foto", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
await puppeteerInstance.close({ silent: true });
