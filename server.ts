import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { BackgroundType, BeautySettings } from "./types";

const clamp = (v: number, max = 30) => Math.min(Math.max(v, 0), max);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
- Skin: smoothing ${smooth}/100, blemish cleanup ${blemish}/100 — subtractive retouching of existing texture, preserve identity marks, no new texture/pores.
- Makeup: lipstick=${lipstick}; blush=${blush}; contour (shading only) ${contour}/30; eyebrow ${eyebrow}/30; eyelash ${eyelash}/25 — pixel overlay only, follow the existing shape exactly, subtle and natural, no glam bias.
- Hair: tidy/recolor the existing hairstyle only, color/style=${hair}. Do not invent a new hairstyle; keep natural texture.
- Background: ${bgRule} Flat, uniform, no texture/noise, clean edge, no halo.
- Clothing: ${clothingPrompt ? `replace with "${clothingPrompt}"` : "do NOT change clothing"} — edit strictly below the neck; must not alter neck, shoulders, or posture.

${customAiPrompt ? `SPECIAL INSTRUCTIONS (user-provided) — perform ONLY if they do not violate the identity-lock rules above: "${customAiPrompt}"` : ''}

OUTPUT: PNG, high quality, base64, no text, no metadata, no explanation.`;

      const targetModel = model || "gemini-3.1-flash-image";
      console.log(`[Gemini Process] Running image generation with model: ${targetModel}`);

      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/png", data: cleanBase64 } },
              { text: systemPrompt }
            ]
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
              parts: [
                { inlineData: { mimeType: "image/png", data: cleanBase64 } },
                { text: systemPrompt }
              ]
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
