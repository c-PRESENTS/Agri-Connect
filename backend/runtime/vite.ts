import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../../vite.config";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const viteLogger = createLogger();

function getHmrOptions(server: Server) {
  const host = process.env.VITE_HMR_HOST?.trim()
    || process.env.REPLIT_DEV_DOMAIN?.trim();
  const configuredProtocol = process.env.VITE_HMR_PROTOCOL?.trim().toLowerCase();
  const protocol = configuredProtocol === "ws" || configuredProtocol === "wss"
    ? configuredProtocol
    : host ? "wss" as const : undefined;
  const configuredPort = Number(process.env.VITE_HMR_CLIENT_PORT);
  const clientPort = Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : host ? 443 : undefined;

  return {
    server,
    ...(host ? { host } : {}),
    ...(protocol ? { protocol } : {}),
    ...(clientPort ? { clientPort } : {}),
  };
}

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: getHmrOptions(server),
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "frontend",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${randomUUID()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
