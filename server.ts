
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/api";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust proxy for Cloud Run/Nginx
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier integration with AI Studio preview if needed, or configure it carefully
}));

app.use(express.json({ limit: '10mb' }));

// Rate Limiters
const generateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.body?.language || 'en';
    const message = lang === 'ru' 
      ? "Слишком много запросов. Пожалуйста, подождите 10 минут."
      : "Too many requests. Please try again in 10 minutes.";
    res.status(429).json({ error: message, status: 429 });
  }
});

const detailsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.body?.language || 'en';
    const message = lang === 'ru' 
      ? "Слишком много запросов деталей. Пожалуйста, подождите 10 минут."
      : "Too many requests for details. Please try again in 10 minutes.";
    res.status(429).json({ error: message, status: 429 });
  }
});

// Apply rate limiters to specific routes
app.use("/api/generate", generateLimiter);
app.use("/api/node-details", detailsLimiter);

// API Routes
app.use("/api", apiRouter);

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const shouldDisableHMR = process.env.DISABLE_HMR === "true" || !!process.env.K_SERVICE;
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: shouldDisableHMR ? false : undefined,
        },
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
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error("Unhandled error in startServer:", err);
  process.exit(1);
});
