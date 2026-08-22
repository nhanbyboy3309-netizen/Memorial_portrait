
import { BackgroundType, BeautySettings, PhotoSize } from "../types";

/* ======================================================
   1️⃣ ANALYZE CAMERA FRAME (JSON ONLY)
====================================================== */
export const analyzeIDPhotoFrame = async (
  base64Frame: string
): Promise<{
  isCompliant: boolean;
  status: "VALID" | "ADJUSTING" | "INVALID";
  feedback: string;
  instruction: string;
  faceDetected: boolean;
}> => {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Frame })
    });

    if (!response.ok) {
      if (response.status === 403) throw new Error("PERMISSION_DENIED");
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "SERVER_ERROR");
    }

    return await response.json();
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    if (err.message === "PERMISSION_DENIED") throw err;
    return {
      isCompliant: true,
      status: "VALID",
      feedback: "Offline mode",
      instruction: "Ready",
      faceDetected: true
    };
  }
};

/* ======================================================
   2️⃣ PROCESS ID PHOTO (IMAGE OUTPUT)
====================================================== */
export const processIDPhoto = async (
  imageBase64: string,
  bgType: BackgroundType,
  clothingPrompt: string | undefined,
  beauty: BeautySettings,
  size: PhotoSize,
  customColor?: string,
  customAiPrompt?: string
): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        bgType,
        clothingPrompt,
        beauty,
        size,
        customColor,
        customAiPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error("AI_QUOTA_EXCEEDED");
      if (response.status === 404) throw new Error("MODEL_NOT_FOUND");
      if (response.status === 403) throw new Error("PERMISSION_DENIED");
      throw new Error(errorData.error || "SERVER_ERROR");
    }

    const data = await response.json();
    return data.image;
  } catch (err: any) {
    console.error("Gemini processing error:", err);
    throw err;
  }
};
