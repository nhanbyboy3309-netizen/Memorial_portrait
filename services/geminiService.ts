
import { BackgroundType, BeautySettings, PhotoSize } from "../types";

/* ======================================================
   DETERMINE APPROPRIATE AI MODEL
   Simple edits (background only) use the fast flash model;
   heavier generative work (restoration/colorize/sharpen,
   makeup, hair, clothing, custom prompts) uses the
   professional-grade pro model for better quality.
====================================================== */
export interface AIModelSelectionResult {
  model: string;
  isComplex: boolean;
  reason: string;
}

const SIMPLE_MODEL = 'gemini-3.1-flash-image';
const COMPLEX_MODEL = 'gemini-3-pro-image';

export const determineAIModel = (
  clothingPrompt: string | undefined,
  beauty: BeautySettings,
  customAiPrompt: string | undefined
): AIModelSelectionResult => {
  const safeBeauty = beauty || ({} as BeautySettings);
  const hasClothing = Boolean(clothingPrompt && clothingPrompt.trim().length > 0);
  const hasRestoration =
    (safeBeauty.restorationIntensity || 0) > 0 ||
    (safeBeauty.colorizeIntensity || 0) > 0 ||
    (safeBeauty.sharpenIntensity || 0) > 0;
  const hasMakeup =
    (safeBeauty.smoothSkin || 0) > 0 ||
    (safeBeauty.blemishIntensity || 0) > 0 ||
    (safeBeauty.lipstickIntensity || 0) > 0 ||
    (safeBeauty.blushIntensity || 0) > 0 ||
    (safeBeauty.eyebrowIntensity || 0) > 0 ||
    (safeBeauty.eyelashIntensity || 0) > 0 ||
    (safeBeauty.contourIntensity || 0) > 0;
  const hasHairEdit =
    (safeBeauty.hairVolume || 0) > 0 ||
    (safeBeauty.hairColor && safeBeauty.hairColor !== 'original');
  const hasCustomPrompt = Boolean(customAiPrompt && customAiPrompt.trim().length > 0);

  const isComplex = hasClothing || hasRestoration || hasMakeup || hasHairEdit || hasCustomPrompt;

  if (!isComplex) {
    return {
      model: SIMPLE_MODEL,
      isComplex: false,
      reason: `Dùng model ${SIMPLE_MODEL} xử lý nhanh phông nền`
    };
  }

  const reasons: string[] = [];
  if (hasRestoration) reasons.push("phục hồi/tô màu/làm nét ảnh cũ");
  if (hasClothing) reasons.push("thay trang phục");
  if (hasMakeup) reasons.push("trang điểm AI");
  if (hasHairEdit) reasons.push("chỉnh sửa tóc");
  if (hasCustomPrompt) reasons.push("yêu cầu tùy chỉnh");

  return {
    model: COMPLEX_MODEL,
    isComplex: true,
    reason: `Dùng model chuyên nghiệp ${COMPLEX_MODEL} do tác vụ phức tạp (${reasons.join(", ")})`
  };
};

/* ======================================================
   PROCESS ID PHOTO (IMAGE OUTPUT)
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
  const { model: targetModel } = determineAIModel(clothingPrompt, beauty, customAiPrompt);

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
        customAiPrompt,
        model: targetModel
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
