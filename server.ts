import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { BackgroundType, BeautySettings } from "./types";

const clamp = (v: number, max = 30) => Math.min(Math.max(v, 0), max);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      isCompliant: { type: Type.BOOLEAN },
      status: { type: Type.STRING },
      feedback: { type: Type.STRING },
      instruction: { type: Type.STRING },
      faceDetected: { type: Type.BOOLEAN }
    },
    required: ["isCompliant", "status", "feedback", "instruction", "faceDetected"]
  };

  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { base64Frame } = req.body;
      if (!base64Frame) return res.status(400).json({ error: "Missing image" });

      const ai = getAI();
      const cleanBase64 = base64Frame.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
            { text: `
You are an ID photo compliance inspector.

Evaluate ONLY:
- Face detected
- Head centered & straight
- Neutral expression
- Lighting balance
- Background neutrality

No beautification.
No assumptions.
Return JSON strictly following schema.
` }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema
        }
      });

      const raw = response.text;
      if (!raw) throw new Error("Empty AI response");

      const json = raw.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(json));
    } catch (error: any) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/process", async (req, res) => {
    try {
      const {
        imageBase64,
        bgType,
        clothingPrompt,
        beauty,
        customColor,
        customAiPrompt
      }: {
        imageBase64: string;
        bgType: BackgroundType;
        clothingPrompt?: string;
        beauty: BeautySettings;
        customColor?: string;
        customAiPrompt?: string;
      } = req.body;

      if (!imageBase64) return res.status(400).json({ error: "Missing image" });

      const ai = getAI();
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      /* ===== INTENSITY SAFE ===== */
      const contour = clamp((beauty.contourIntensity / 100) * 50);
      const blemish = clamp((beauty.blemishIntensity / 100) * 100);
      const eyebrow = clamp((beauty.eyebrowIntensity / 100) * 500);
      const eyelash = clamp((beauty.eyelashIntensity / 100) * 505);
      const restore = clamp(beauty.restorationIntensity ?? 100);
      const colorize = clamp(beauty.colorizeIntensity ?? 100);
      const sharpen = clamp(beauty.sharpenIntensity ?? 100);

      const lipstick = beauty.lipstickColor !== 'none' ? `${beauty.lipstickColor} (Intensity: ${beauty.lipstickIntensity}%)` : 'None';
      const blush = beauty.blushColor !== 'none' ? `${beauty.blushColor} (Intensity: ${beauty.blushIntensity}%)` : 'None';
      const hair = beauty.hairColor !== 'original' ? `${beauty.hairColor} (Volume/Intensity: ${beauty.hairVolume}%)` : 'Original';

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

      const systemPrompt = `
YOU ARE A PROFESSIONAL Memorial portrait PROCESSOR.

================ ABSOLUTE IDENTITY RULES ================
- Preserve identity at all costs.
- Facial proportions must remain visually identical.
- NO face reshaping, slimming, widening, lifting.
- NO new moles, freckles, dots, pigmentation.
- DO NOT remove permanent marks.
- If any operation risks identity → SKIP IT.

================ STEP 0 – IMAGE SCAN & TECHNICAL ANALYSIS (MANDATORY) ================

BEFORE performing ANY modification, you MUST execute a full, non-destructive
technical analysis of the ENTIRE input image.

THIS STEP IS ANALYSIS-ONLY.
NO pixel modification is allowed in this step.

---------------- ANALYSIS OBJECTIVES ----------------
Analyze and internally record the following attributes:

1. IMAGE ORIGIN
- Native digital photo
- Scanned printed photo
- Photograph of a printed photo
- Screenshot or compressed image

2. TECHNICAL QUALITY
- Resolution adequacy (sufficient / low / very low)
- Global sharpness (sharp / mildly blurred / heavily blurred)
- Motion blur presence (none / slight / strong)
- Noise level (none / low / medium / high)
- Compression artifacts (none / mild / heavy)
- Color condition:
  - Full color
  - Faded color
  - Grayscale / black & white

3. LIGHTING & EXPOSURE
- Overall exposure (balanced / underexposed / overexposed)
- Shadow severity on face (none / mild / strong)
- Highlight clipping (none / mild / severe)
- Color cast presence (none / warm / cool / mixed)

4. FACE & SUBJECT DETECTION (OBSERVATION ONLY)
- Face detected: yes / no
- Face clarity: clear / partially unclear / unclear
- Occlusion: none / hair / glasses / shadow / other
- Expression: neutral / non-neutral
- Head pose: straight / slightly rotated / invalid for ID

IMPORTANT:
- Do NOT perform facial landmark detection.
- Do NOT estimate attractiveness, age, or emotion.
- Do NOT normalize, align, rotate, or crop.

---------------- DEGRADATION CLASSIFICATION ----------------
Based on the analysis, internally classify image degradation:

- LEVEL 0: Clean, modern, high-quality image
- LEVEL 1: Minor degradation
- LEVEL 2: Moderate degradation
- LEVEL 3: Severe degradation

---------------- DECISION GATES (CRITICAL) ----------------
Use the analysis results STRICTLY as CONDITIONS for later steps:

- If LEVEL 0:
  → ALL restoration, colorization, and sharpening MUST be SKIPPED.

- If LEVEL 1:
  → Restoration allowed with intensity ≤ 10 only.

- If LEVEL 2:
  → Restoration allowed with intensity ≤ 20 only.

- If LEVEL 3:
  → Restoration allowed with intensity ≤ 30,
    corrective only, NON-GENERATIVE.

- If face clarity is NOT "clear":
  → Makeup operations MUST be SKIPPED.

- If image is already full color:
  → Colorization MUST be SKIPPED.

- If sharpening risks creating dot-like artifacts on skin:
  → Sharpening MUST be SKIPPED.

---------------- FAIL-SAFE DEFAULT ----------------
If analysis confidence is insufficient or ambiguous:
→ Treat image as LEVEL 0
→ SKIP ALL optional enhancement steps.

This analysis step has ABSOLUTE PRIORITY.
All subsequent steps MUST obey the conditions derived here.


================ BACKGROUND =============================
${bgRule}
- Flat, uniform, no texture, no noise.
- Clean edge, no halo.

================ RESTORATION =============================
Intensity: ${restore}/100
- Corrective only (noise, blur, fade).
- NON-GENERATIVE.
- If unclear detail → leave unchanged.

================ COLORIZATION ============================
Intensity: ${colorize}/100
- Only if image is grayscale.
- Neutral Vietnamese skin tone.
- No makeup during colorization.

================ SHARPEN ================================
Intensity: ${sharpen}/100
- Edge clarity only.
- If sharpening creates dot-like skin artifacts → SKIP.

================ MAKEUP ================================
Blemish clean: ${blemish}/100
Contour: ${contour}/30
Eyebrow: ${eyebrow}/30
Eyelash: ${eyelash}/25
Lipstick: ${lipstick}
Blush: ${blush}
Hair Color/Style: ${hair}

Rules:
- Makeup = pixel overlay only.
- Follow existing shape exactly.
- No glam, no beautification bias.
- Lipstick should be subtle and natural unless intensity is high.
- Blush should be soft and blended.
- Hair color changes should look realistic and maintain texture.

================ CLOTHING ================================
${clothingPrompt ? `Replace clothing with: "${clothingPrompt}"` : "Do NOT change clothing"}
- Must not alter neck, shoulders, posture.

${customAiPrompt ? `
================ SPECIAL INSTRUCTIONS (USER PROVIDED) ================
The user has provided the following specific requests.
Perform them ONLY IF they do not violate the Identity Preservation rules:
"${customAiPrompt}"
` : ""}

================ OUTPUT ================================
- Output ONLY the final image.
- PNG, high quality, base64.
- No text, no metadata.
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
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
        if (msg.includes("403") || msg.includes("404")) {
          console.warn("Falling back to gemini-2.5-flash-image");
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
