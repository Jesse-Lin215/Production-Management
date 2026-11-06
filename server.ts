import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check API route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Return standalone offline HTML and ZIP as JSON for client-side Blob download (immune to iframe proxy auth issues)
  app.get("/api/offline-bundle", (req, res) => {
    try {
      const htmlPath = path.join(process.cwd(), "双击直接打开MES排产系统.html");
      const zipPath = path.join(process.cwd(), "MES生产排产调度系统_解压直接双击预览.zip");
      const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
      const zipBase64 = fs.existsSync(zipPath) ? fs.readFileSync(zipPath).toString("base64") : "";
      res.json({
        ok: true,
        html,
        zipBase64,
        sizeBytes: Buffer.byteLength(html, "utf8"),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || "读取离线包失败" });
    }
  });

  // Download standalone offline HTML file
  app.get("/api/download-offline", (req, res) => {
    const offlineFilePath = path.join(process.cwd(), "双击直接打开MES排产系统.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"MES-Offline.html\"; filename*=UTF-8''%E5%8F%8C%E5%87%BB%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80MES%E6%8E%92%E4%BA%A7%E7%B3%BB%E7%BB%9F.html"
    );
    res.sendFile(offlineFilePath);
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
