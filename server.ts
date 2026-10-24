import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { BackgroundType, BeautySettings } from "./types";

const clamp = (v: number, max = 30) => Math.min(Math.max(v, 0), max);

// === LOCAL PERSISTENT PHOTO STORAGE FALLBACK ===
const DATA_DIR = path.join(process.cwd(), ".data");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");

interface ServerSavedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  settings?: any;
}

const photoStore = new Map<string, ServerSavedPhoto>();

function initPhotoStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(PHOTOS_FILE)) {
      const content = fs.readFileSync(PHOTOS_FILE, "utf-8");
      const list: ServerSavedPhoto[] = JSON.parse(content);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.id) {
            photoStore.set(item.id, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[PhotoStorage] Warning reading photos.json:", err);
  }
}

function persistPhotoStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const all = Array.from(photoStore.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 100); // Keep 100 most recent
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(all), "utf-8");
  } catch (err) {
    console.warn("[PhotoStorage] Warning saving photos.json:", err);
  }
}

initPhotoStorage();

// === PHOTO ID: MP + ddmmyy + NNN (e.g. MP251025001) ===
// "MP" is fixed, ddmmyy is today's date in Vietnam time, NNN is that day's running number
// (001, 002, ...; grows to 4+ digits only if a day exceeds 999 photos).
const lastSeqByDay = new Map<string, number>(); // never hand out a number twice in one process, even after deletes

function todayDdmmyy(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "2-digit"
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return `${get("day")}${get("month")}${get("year")}`;
}

// Synchronous on purpose: Node runs it to completion, so two requests can never get the same number.
function generatePhotoId(): string {
  const day = todayDdmmyy();
  const prefix = `MP${day}`;
  const re = new RegExp(`^${prefix}(\\d{3,})$`);
  let max = lastSeqByDay.get(day) || 0;
  for (const id of photoStore.keys()) {
    const m = re.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  lastSeqByDay.set(day, next);
  return `${prefix}${String(next).padStart(3, "0")}`;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", totalPhotos: photoStore.size });
  });

  // Local Photo Storage Endpoints (Server Fallback for Cloud Sync)
  app.post("/api/photos", (req, res) => {
    try {
      const { id, dataUrl, settings, timestamp } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ success: false, error: "Missing dataUrl" });
      }
      // No ID sent => this is a new photo: issue the next MPddmmyyNNN ID.
      const photo: ServerSavedPhoto = {
        id: id ? String(id) : generatePhotoId(),
        dataUrl,
        timestamp: Number(timestamp) || Date.now(),
        settings: settings || {}
      };
      photoStore.set(photo.id, photo);
      persistPhotoStorage();
      console.log(`[PhotoStorage] Saved photo ${photo.id} (total: ${photoStore.size})`);
      res.json({ success: true, id: photo.id });
    } catch (err: any) {
      console.error("[PhotoStorage] Save error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to save photo" });
    }
  });

  app.get("/api/photos/:id", (req, res) => {
    const photo = photoStore.get(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, error: "Photo not found" });
    }
    res.json({ success: true, photo });
  });

  app.get("/api/photos", (req, res) => {
    const photos = Array.from(photoStore.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
    res.json({ success: true, photos });
  });

  app.delete("/api/photos/:id", (req, res) => {
    const id = req.params.id;
    const exists = photoStore.has(id);
    if (exists) {
      photoStore.delete(id);
      persistPhotoStorage();
      return res.json({ success: true });
    }
    res.json({ success: false, error: "Not found" });
  });

  // Diagnostic Endpoint for Testing Google Apps Script URL
  app.post("/api/cloud/test", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).json({
        success: false,
        error: "URL không hợp lệ. Vui lòng nhập link Google Apps Script bắt đầu bằng https://"
      });
    }

    try {
      const testPayload = JSON.stringify({ action: "getConfig", _t: Date.now() });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url.trim(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: testPayload,
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeout);

      const status = response.status;
      const text = await response.text();
      const trimmed = text.trim();
      const isHtml = trimmed.startsWith("<") || trimmed.includes("<!DOCTYPE") || trimmed.includes("<html");

      if (isHtml) {
        if (
          trimmed.includes("找不到網頁") ||
          trimmed.includes("Không tìm thấy") ||
          trimmed.includes("404") ||
          status === 404
        ) {
          return res.json({
            success: false,
            statusCode: status,
            isHtml: true,
            error: "Google trả về 404: Không tìm thấy triển khai Apps Script này. URL có thể đã bị xóa hoặc chưa được tạo bản triển khai mới."
          });
        }
        if (
          trimmed.includes("Sign in") ||
          trimmed.includes("Đăng nhập") ||
          trimmed.includes("accounts.google.com")
        ) {
          return res.json({
            success: false,
            statusCode: status,
            isHtml: true,
            error: "Google yêu cầu đăng nhập: Quyền truy cập Web App chưa được chọn 'Anyone' (Bất kỳ ai)."
          });
        }
        return res.json({
          success: false,
          statusCode: status,
          isHtml: true,
          error: "Google trả về trang HTML thay vì JSON. Vui lòng kiểm tra lại cấu hình Web App trong Google Apps Script."
        });
      }

      try {
        const json = JSON.parse(trimmed);
        return res.json({
          success: true,
          statusCode: status,
          isHtml: false,
          message: "Kết nối Google Apps Script thành công!",
          data: json
        });
      } catch {
        return res.json({
          success: false,
          statusCode: status,
          isHtml: false,
          error: `Dữ liệu trả về không phải JSON hợp lệ: ${trimmed.substring(0, 100)}`
        });
      }
    } catch (err: any) {
      return res.json({
        success: false,
        error: `Không thể kết nối đến Google Apps Script: ${err.message || String(err)}`
      });
    }
  });

  const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  app.post("/api/gemini/process", async (req, res) => {
    try {
      const {
        imageBase64,
        bgType,
        clothingPrompt,
        beauty,
        customColor,
        customAiPrompt,
        model
      }: {
        imageBase64: string;
        bgType: BackgroundType;
        clothingPrompt?: string;
        beauty: BeautySettings;
        customColor?: string;
        customAiPrompt?: string;
        model?: string;
      } = req.body;

      if (!imageBase64) return res.status(400).json({ error: "Missing image" });

      const ai = getAI();
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const maskBase64 = beauty.blemishMaskUrl ? beauty.blemishMaskUrl.replace(/^data:image\/\w+;base64,/, "") : null;

      /* ===== INTENSITY SAFE =====
         Each slider is 0-100 from the UI; scale linearly to the prompt's
         target range (matching the "/N" labels below) instead of relying
         on clamp()'s default max=30, which previously saturated eyebrow/
         eyelash by ~6% input and silently capped restoration/colorize/
         sharpen at 30 even when the user asked for up to 100. */
      const smooth = clamp(beauty.smoothSkin, 100);
      const contour = clamp((beauty.contourIntensity / 100) * 30, 30);
      const blemish = clamp(beauty.blemishIntensity, 100);
      const eyebrow = clamp((beauty.eyebrowIntensity / 100) * 30, 30);
      const eyelash = clamp((beauty.eyelashIntensity / 100) * 25, 25);
      const restore = clamp(beauty.restorationIntensity ?? 0, 100);
      const colorize = clamp(beauty.colorizeIntensity ?? 0, 100);
      const sharpen = clamp(beauty.sharpenIntensity ?? 0, 100);

      const lipstick = beauty.lipstickColor !== 'none' ? `${beauty.lipstickColor} (Intensity: ${beauty.lipstickIntensity}%)` : 'None';
      const blush = beauty.blushColor !== 'none' ? `${beauty.blushColor} (Intensity: ${beauty.blushIntensity}%)` : 'None';
      // hairColor is undefined until the user explicitly picks one (see PhotoBooth.tsx defaults),
      // so this must not fall into the "changed" branch on undefined — that previously rendered
      // the literal text "undefined" into the prompt for every photo that never touched hair color.
      const hair = (beauty.hairColor && beauty.hairColor !== 'original') ? `${beauty.hairColor} (Volume/Intensity: ${beauty.hairVolume}%)` : 'Original';

      const AGE_LABELS: Record<string, string> = {
        baby: 'infant/young child', child: 'child', young: 'young adult',
        middle: 'middle-aged adult', old: 'elderly'
      };
      const demographicHint = (beauty.restorationGender || beauty.restorationAge)
        ? `Subject reference: ${beauty.restorationGender || 'unspecified gender'}, ${AGE_LABELS[beauty.restorationAge || ''] || 'unspecified age'}. Use this ONLY to keep any reconstructed hair/clothing/skin-tone period- and demographic-appropriate when repairing damaged or missing regions — never to alter visible facial features or true identity.`
        : '';

      /* ===== BACKGROUND RULE ===== */
      let bgRule = "Do NOT modify background.";
      if (bgType === BackgroundType.WHITE) {
        bgRule = "Set background to pure white RGB(255,255,255), flat, no gradient.";
      } else if (bgType === BackgroundType.BLUE) {
        bgRule = "Set background to RGB(39,146,255), flat, no gradient.";
      } else if (bgType === BackgroundType.GRAY) {
        bgRule = "Set background to RGB(209,213,219), flat, no gradient.";
      } else if (bgType === BackgroundType.CUSTOM && customColor) {
        bgRule = `Set background color to HEX ${customColor}, flat, uniform.`;
      }

      const systemPrompt = `ROLE: Professional old-photo restoration AI for memorial and keepsake portraits (ảnh thờ, ảnh kỷ niệm). Priority 1 (never violate): preserve the subject's identity exactly, especially on damaged or low-quality source photos. Priority 2: apply the requested restoration and beautification fully and well — do not under-apply it out of excess caution.

IDENTITY LOCK — hard rule, always: face shape, bone structure, proportions, and the exact position/size/shape of eyes, nose, mouth, eyebrows, and ears must stay identical to the original. No reshaping, resizing, or repositioning of any facial feature. Never add or remove moles, freckles, scars, or birthmarks. Never invent skin texture, wrinkles, or interpret film grain/scan noise/damage as facial features. Always compare against the original image; do not re-detect or reinterpret geometry. If no face is found, or it is too damaged to identify, output the original image unchanged.
${demographicHint}

CONDITION-AWARE RESTORATION — first judge the photo's actual physical condition (clean digital photo vs. faded/scratched/blurry/noisy print scan); the intensities below are a CEILING, not a target:
- Already clean, modern, high-quality photo → skip restoration, colorization, and sharpening entirely, regardless of the requested intensity.
- Lightly worn (minor fading/blur/noise) → restore correctively, well under the requested intensity.
- Heavily damaged (torn, faded, heavy noise/blur) → restore correctively and non-generatively only — repair existing detail, never invent new detail; cap at the requested intensity.
- Colorize ONLY if the source is grayscale/monochrome; skip entirely if it is already in color.
- Skip sharpening if it would create dot-like or grainy artifacts on skin.
- If the face is not clearly visible, skip makeup operations.

ALLOWED — cosmetic surface edits (color/texture only, never geometry; this IS the requested restoration/beautification, apply it at the given intensity subject to the condition caps above, not just minimally):
- Restoration ${restore}/100, Colorization ${colorize}/100, Sharpen ${sharpen}/100 (see condition-aware caps above).
- Skin: smoothing ${smooth}/100, blemish cleanup ${blemish}/100 — subtractive retouching of existing texture, preserve identity marks. Keep it natural and photographic, never plastic/waxy/airbrushed: retain fine skin pores and micro-texture proportional to the requested intensity (even at high smoothing, pores should remain faintly visible up close), keep natural skin color variation and gentle shading around the nose/cheeks/forehead, and never flatten skin into a uniform matte surface. No new texture/pores beyond what naturally exists.
- Makeup: lipstick=${lipstick}; blush=${blush}; contour (shading only) ${contour}/30; eyebrow ${eyebrow}/30; eyelash ${eyelash}/25 — pixel overlay only, follow the existing shape exactly, subtle and natural, no glam bias.
- Hair: tidy/recolor the existing hairstyle only, color/style=${hair}. Do not invent a new hairstyle; keep natural texture.
- Background: ${bgRule} Flat, uniform, no texture/noise, clean edge, no halo.
- Clothing: ${clothingPrompt ? `replace with "${clothingPrompt}"` : "do NOT change clothing"} — edit strictly below the neck; must not alter neck, shoulders, or posture.

${maskBase64 ? `RETOUCH MASK — IMAGE 2 above is the same photo with the exact spots the user wants removed marked in translucent red (drawn by hand, may be imprecise). Remove ONLY the blemish/spot/mark located under each red-marked area, using subtractive retouching that matches the immediately surrounding skin tone and texture. Do NOT retouch, smooth, or alter any other part of the skin, even other visible blemishes, unless already covered by the "Skin" instruction above — everything outside the red-marked areas must stay pixel-for-pixel as close to the original as possible.` : ''}

${customAiPrompt ? `SPECIAL INSTRUCTIONS (user-provided) — perform ONLY if they do not violate the identity-lock rules above: "${customAiPrompt}"` : ''}

OUTPUT: PNG, high quality, base64, no text, no metadata, no explanation.`;

      const targetModel = model || "gemini-3.1-flash-image";
      console.log(`[Gemini Process] Running image generation with model: ${targetModel}`);

      const imageParts = [
        { inlineData: { mimeType: "image/png", data: cleanBase64 } },
        ...(maskBase64 ? [{ inlineData: { mimeType: "image/png", data: maskBase64 } }] : [])
      ];

      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents: [{
            role: "user",
            parts: [...imageParts, { text: systemPrompt }]
          }]
        });
      } catch (firstErr: any) {
        const msg = JSON.stringify(firstErr);
        if ((msg.includes("403") || msg.includes("404")) && targetModel !== "gemini-2.5-flash-image") {
          console.warn(`Model ${targetModel} unavailable, falling back to gemini-2.5-flash-image`);
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [{
              role: "user",
              parts: [...imageParts, { text: systemPrompt }]
            }]
          });
        } else {
          throw firstErr;
        }
      }

      const candidates = response.candidates;
      if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            return res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
          }
        }
      }

      throw new Error("AI không trả về ảnh");
    } catch (error: any) {
      console.error("Processing Error:", error);
      const msg = JSON.stringify(error);
      let status = 500;
      if (msg.includes("429")) status = 429;
      else if (msg.includes("404")) status = 404;
      else if (msg.includes("403")) status = 403;
      res.status(status).json({ error: error.message || "PROCESSING_ERROR" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
