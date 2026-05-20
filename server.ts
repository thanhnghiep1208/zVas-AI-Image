import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local environment variables for development.
// Priority: .env.local -> .env
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

// Initialize Firebase Admin
// In this environment, we can use the project ID from the config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
// We use the projectId and databaseId from the config. 
// The environment should provide the necessary credentials automatically.
const firebaseApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const auth = admin.auth();

// Simple in-memory rate limiting (10 requests per minute per user)
const memoryRateLimit = new Map<string, number[]>();

interface GenerateRequestBody {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  provider?: "gemini" | "openai" | "seedance" | "seedream";
  geminiModel?: string;
  openaiModel?: string;
  seedanceModel?: string;
  seedanceBaseUrl?: string;
  seedreamModel?: string;
  seedreamBaseUrl?: string;
  mainImage?: { data: string; mimeType: string } | null;
  referenceImages?: Array<{ data: string; mimeType: string }>;
}

interface ProviderTestRequestBody {
  provider?: "gemini" | "openai" | "seedance" | "seedream";
  seedanceBaseUrl?: string;
  seedreamBaseUrl?: string;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use((err: any, req: any, res: any, next: any) => {
    if (err?.type === "entity.too.large") {
      return res.status(413).json({
        error: "Request payload too large. Please use a smaller image or compress before upload."
      });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON payload." });
    }
    return next(err);
  });

  // Middleware to verify Firebase ID Token
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Error verifying ID token:", error);
      res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  };

  // API Endpoint: POST /api/rate-limit
  // This endpoint is called by the frontend before making a Gemini API call
  app.post("/api/rate-limit", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Use in-memory rate limiting primarily to avoid Firestore permission issues in this environment
    let userRequests = memoryRateLimit.get(userId) || [];
    userRequests = userRequests.filter(t => t > oneMinuteAgo);
    
    if (userRequests.length >= 10) {
      return res.status(429).json({ error: "Too many requests. Please wait a minute." });
    }
    
    userRequests.push(now);
    memoryRateLimit.set(userId, userRequests);
    
    // Clean up memory cache occasionally
    if (memoryRateLimit.size > 1000) {
      const oldestAllowed = Date.now() - 5 * 60 * 1000;
      for (const [id, times] of memoryRateLimit.entries()) {
        const filtered = times.filter(t => t > oldestAllowed);
        if (filtered.length === 0) memoryRateLimit.delete(id);
        else memoryRateLimit.set(id, filtered);
      }
    }

    res.json({ status: "ok" });
  });

  app.post("/api/generate", authenticate, async (req: any, res: any) => {
    try {
      const body = req.body as GenerateRequestBody;
      const settingsDoc = await db.collection("settings").doc("global").get();
      const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
      const enabledProviders = Array.isArray(settings.enabledProviders) ? settings.enabledProviders : [];
      const fallbackProvider =
        enabledProviders.find(
          (item: string) =>
            item === "gemini" || item === "openai" || item === "seedance" || item === "seedream"
        ) || "gemini";
      const provider = body.provider || fallbackProvider;
      const prompt = (body.prompt || "").trim();
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: "OpenAI API Key chưa được cấu hình." });
        }

        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: body.openaiModel || settings.openaiModel || "dall-e-3",
            prompt,
            n: 1,
            size: body.aspectRatio === "1:1" ? "1024x1024" : body.aspectRatio === "16:9" ? "1792x1024" : "1024x1792",
            quality: "standard",
            response_format: "b64_json"
          })
        });

        if (!response.ok) {
          const err = await response.json();
          return res.status(response.status).json({ error: err.error?.message || "Lỗi từ OpenAI API" });
        }

        const data: any = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || "",
          text: data.data?.[0]?.revised_prompt || "",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        });
      }

      if (provider === "seedance") {
        const apiKey = process.env.SEEDANCE_API_KEY;
        const baseUrl = body.seedanceBaseUrl || settings.seedanceBaseUrl || "https://api.seedance.com/v1";
        const model = body.seedanceModel || settings.seedanceModel || "seed-1.5-pro";
        if (!apiKey) {
          return res.status(400).json({ error: "Seedance API Key chưa được cấu hình." });
        }

        const response = await fetch(`${baseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: body.aspectRatio === "1:1" ? "1024x1024" : body.aspectRatio === "16:9" ? "1792x1024" : "1024x1792",
            response_format: "b64_json"
          })
        });

        if (!response.ok) {
          const err = await response.json();
          return res.status(response.status).json({ error: err.error?.message || "Lỗi từ Seedance API" });
        }

        const data: any = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || "",
          text: data.data?.[0]?.revised_prompt || "",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        });
      }

      if (provider === "seedream") {
        const apiKey = process.env.SEEDREAM_API_KEY;
        const baseUrl = body.seedreamBaseUrl || settings.seedreamBaseUrl || "https://ark.cn-beijing.volces.com/api/v3";
        const model = body.seedreamModel || settings.seedreamModel || "seedream-4.0";
        if (!apiKey) {
          return res.status(400).json({ error: "Seedream API Key chưa được cấu hình." });
        }

        const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: body.aspectRatio === "1:1" ? "1024x1024" : body.aspectRatio === "16:9" ? "1792x1024" : "1024x1792",
            response_format: "b64_json"
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(async () => ({ error: { message: await response.text() } }));
          return res.status(response.status).json({ error: err.error?.message || "Lỗi từ Seedream API" });
        }

        const data: any = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || "",
          text: data.data?.[0]?.revised_prompt || "",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const geminiModel = body.geminiModel || settings.geminiModel || "gemini-3.1-flash-image-preview";
      if (!geminiApiKey) {
        return res.status(400).json({ error: "Gemini API key missing. Please contact admin." });
      }

      const ai = new GoogleGenAI({ apiKey: String(geminiApiKey).trim() });
      const parts: any[] = [];

      if (body.mainImage?.data && body.mainImage?.mimeType) {
        parts.push({
          inlineData: {
            data: body.mainImage.data,
            mimeType: body.mainImage.mimeType
          }
        });
      }

      if (Array.isArray(body.referenceImages)) {
        for (const ref of body.referenceImages) {
          if (ref?.data && ref?.mimeType) {
            parts.push({
              inlineData: {
                data: ref.data,
                mimeType: ref.mimeType
              }
            });
          }
        }
      }

      parts.push({ text: prompt });

      const response: any = await ai.models.generateContent({
        model: geminiModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: body.aspectRatio || "1:1",
            imageSize: body.imageSize || "1K"
          }
        }
      });

      let imageBase64 = "";
      let text = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
          } else if (part.text) {
            text = part.text;
          }
        }
      }

      if (!imageBase64) {
        return res.status(500).json({ error: "No image was generated by the model." });
      }

      const usage = response.usageMetadata || {};
      return res.json({
        imageBase64,
        text,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || ((usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0))
      });
    } catch (error: any) {
      console.error("Generate API error:", error);
      return res.status(500).json({ error: error?.message || "Generation failed." });
    }
  });

  app.post("/api/provider-test", authenticate, async (req: any, res: any) => {
    try {
      const body = (req.body || {}) as ProviderTestRequestBody;
      const settingsDoc = await db.collection("settings").doc("global").get();
      const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
      const enabledProviders = Array.isArray(settings.enabledProviders) ? settings.enabledProviders : [];
      const fallbackProvider =
        enabledProviders.find(
          (item: string) =>
            item === "gemini" || item === "openai" || item === "seedance" || item === "seedream"
        ) || "gemini";
      const provider = body.provider || fallbackProvider;

      if (provider === "openai") {
        const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: "OpenAI API Key chưa được cấu hình.",
          });
        }

        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `OpenAI test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: "Kết nối OpenAI thành công.",
        });
      }

      if (provider === "seedance") {
        const apiKey = String(process.env.SEEDANCE_API_KEY || "").trim();
        const baseUrlRaw =
          (body.seedanceBaseUrl || "").trim() ||
          String(settings.seedanceBaseUrl || "https://api.seedance.com/v1").trim();
        const baseUrl = baseUrlRaw.replace(/\/+$/, "");
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedance API Key chưa được cấu hình.",
          });
        }
        let parsedBaseUrl: URL;
        try {
          parsedBaseUrl = new URL(baseUrl);
        } catch {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedance base URL không hợp lệ.",
          });
        }
        if (parsedBaseUrl.protocol !== "https:") {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedance base URL phải dùng https://",
          });
        }

        const response = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `Seedance test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: "Kết nối Seedance thành công.",
        });
      }

      if (provider === "seedream") {
        const apiKey = String(process.env.SEEDREAM_API_KEY || "").trim();
        const baseUrlRaw =
          (body.seedreamBaseUrl || "").trim() ||
          String(settings.seedreamBaseUrl || "https://ark.cn-beijing.volces.com/api/v3").trim();
        const baseUrl = baseUrlRaw.replace(/\/+$/, "");
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedream API Key chưa được cấu hình.",
          });
        }
        let parsedBaseUrl: URL;
        try {
          parsedBaseUrl = new URL(baseUrl);
        } catch {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedream base URL không hợp lệ.",
          });
        }
        if (parsedBaseUrl.protocol !== "https:") {
          return res.status(400).json({
            ok: false,
            provider,
            error: "Seedream base URL phải dùng https://",
          });
        }

        const response = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `Seedream test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: "Kết nối Seedream thành công.",
        });
      }

      const geminiApiKey = String(process.env.GEMINI_API_KEY || "").trim();
      if (!geminiApiKey) {
        return res.status(400).json({
          ok: false,
          provider: "gemini",
          error: "Gemini API Key chưa được cấu hình.",
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "GET",
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          ok: false,
          provider: "gemini",
          error: `Gemini test failed (HTTP ${response.status})`,
          detail: errText.slice(0, 240),
        });
      }

      return res.json({
        ok: true,
        provider: "gemini",
        message: "Kết nối Gemini thành công.",
      });
    } catch (error: any) {
      console.error("Provider test error:", error);
      return res.status(500).json({
        ok: false,
        error: error?.message || "Provider test failed.",
      });
    }
  });

  // Vite chỉ load khi dev — production image có thể bỏ qua devDependencies (vite)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 24679,
          clientPort: 24679
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
