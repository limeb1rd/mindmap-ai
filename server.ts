
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import apiRouter from "./routes/api";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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
