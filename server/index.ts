import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Increase body parser limits to handle large PDF uploads (base64 encoded files can be quite large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Set up periodic job postings sync to Airtable (only in production)
  if (process.env.NODE_ENV === 'production') {
    const { jobPostingsAirtableService } = await import('./jobPostingsAirtableService');
    
    const syncJobPostingsPeriodically = async () => {
      try {
        console.log('Running periodic job postings sync to Airtable...');
        await jobPostingsAirtableService.syncJobPostingsToAirtable();
      } catch (error) {
        console.error('Periodic job postings sync failed:', error);
      }
    };

    // Initial sync on server start
    setTimeout(syncJobPostingsPeriodically, 5000); // Wait 5 seconds after server start
    
    // Set up periodic sync every 30 seconds
    setInterval(syncJobPostingsPeriodically, 30000);
    
    console.log('🔄 Background Airtable sync enabled (production mode)');
  } else {
    console.log('⏸️ Background Airtable sync disabled (development mode)');
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 3001
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 3001;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    log(`🔥 Hot reloading enabled - server will restart on file changes`);
  });
})();
