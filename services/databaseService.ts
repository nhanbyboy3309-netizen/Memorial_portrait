
import { SavedPhoto, AppConfig } from "../types";
import { getConfig } from "./configService";

const getScriptUrl = (overrideUrl?: string) => {
    if (overrideUrl && overrideUrl.trim() !== '') return overrideUrl.trim();
    const config = getConfig();
    return (config.googleScriptUrl || '').trim();
};

// Safe JSON parser that catches Google HTML error pages
const safeParseJson = (text: string): { success: boolean; data?: any; error?: string } => {
    const trimmed = text.trim();
    if (!trimmed) {
        return { success: false, error: "Empty response" };
    }
    if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
        let msg = "Google Apps Script returned an HTML page instead of JSON";
        if (trimmed.includes("找不到網頁") || trimmed.includes("Không tìm thấy") || trimmed.includes("404")) {
            msg = "Google Apps Script 404: Script deployment not found or was deleted";
        } else if (trimmed.includes("accounts.google.com") || trimmed.includes("Sign in")) {
            msg = "Google Apps Script authentication required (Must set access to 'Anyone')";
        }
        return { success: false, error: msg };
    }
    try {
        const parsed = JSON.parse(trimmed);
        return { success: true, data: parsed };
    } catch (e: any) {
        return { success: false, error: `Invalid JSON: ${e.message}` };
    }
};

const callAppsScript = async (action: string, payload: any = {}, overrideUrl?: string): Promise<any> => {
    const url = getScriptUrl(overrideUrl);
    if (!url) {
        return { success: false, error: "Missing Google Apps Script URL" };
    }

    try {
        const body = JSON.stringify({ 
            action, 
            ...payload, 
            _t: Date.now() 
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(url, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow',
            signal: controller.signal
        });
        clearTimeout(timeout);

        const text = await response.text();
        const parsed = safeParseJson(text);

        if (!parsed.success) {
            console.warn(`[databaseService] Apps Script Error [${action}]: ${parsed.error}`);
            return { success: false, error: parsed.error };
        }

        return parsed.data;
    } catch (error: any) {
        console.warn(`[databaseService] Apps Script Network Error [${action}]:`, error.message || error);
        return { success: false, error: String(error) };
    }
};

// === LOCAL SERVER STORAGE FALLBACK HELPERS ===
const savePhotoToServer = async (photo: SavedPhoto): Promise<boolean> => {
    try {
        const resp = await fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photo)
        });
        if (resp.ok) {
            const data = await resp.json();
            return !!(data && data.success);
        }
    } catch (e) {
        console.warn('[databaseService] Local server save failed:', e);
    }
    return false;
};

const getPhotoFromServer = async (id: string): Promise<SavedPhoto | null> => {
    try {
        const resp = await fetch(`/api/photos/${encodeURIComponent(id)}`);
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && data.photo) {
                return data.photo as SavedPhoto;
            }
        }
    } catch (e) {
        console.warn('[databaseService] Local server fetch failed:', e);
    }
    return null;
};

const listPhotosFromServer = async (): Promise<SavedPhoto[]> => {
    try {
        const resp = await fetch('/api/photos');
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && Array.isArray(data.photos)) {
                return data.photos as SavedPhoto[];
            }
        }
    } catch (e) {
        console.warn('[databaseService] Local server list failed:', e);
    }
    return [];
};

const deletePhotoFromServer = async (id: string): Promise<boolean> => {
    try {
        const resp = await fetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (resp.ok) {
            const data = await resp.json();
            return !!(data && data.success);
        }
    } catch (e) {
        console.warn('[databaseService] Local server delete failed:', e);
    }
    return false;
};

// Helper: Normalize URL to base64 if needed
const toDataUrl = async (url: string): Promise<string> => {
    if (!url || url.indexOf('data:') === 0) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
};

/**
 * Save photo to Cloud with guaranteed server fallback:
 * 1. Tries Google Apps Script if URL is configured.
 * 2. Saves to local server (/api/photos) as fallback/backup.
 * 3. Returns photo ID on success so QR code and mobile link always work.
 */
export const savePhotoToCloud = async (photo: SavedPhoto, overrideUrl?: string): Promise<string | null> => {
    const photoId = photo.id || `IMG_${Date.now()}`;
    const payloadPhoto: SavedPhoto = {
        ...photo,
        id: photoId,
        timestamp: photo.timestamp || Date.now()
    };

    let appsScriptSuccess = false;
    const scriptUrl = getScriptUrl(overrideUrl);

    // Try Google Apps Script if URL configured
    if (scriptUrl) {
        try {
            const result = await callAppsScript('savePhoto', {
                id: payloadPhoto.id,
                dataUrl: payloadPhoto.dataUrl,
                settings: payloadPhoto.settings,
                timestamp: payloadPhoto.timestamp
            }, overrideUrl);

            if (result && result.success) {
                appsScriptSuccess = true;
            }
        } catch (e) {
            console.warn('[databaseService] Google Apps Script save attempt failed:', e);
        }
    }

    // Always mirror to server storage for guaranteed availability & fast retrieval
    const serverSuccess = await savePhotoToServer(payloadPhoto);

    if (appsScriptSuccess || serverSuccess) {
        return photoId;
    }

    console.error('[databaseService] Both Apps Script and server fallback failed to save photo');
    return null;
};

/**
 * Get photo by ID:
 * 1. Checks fast local server storage first.
 * 2. If not found locally, queries Google Apps Script.
 */
export const getPhotoById = async (id: string, overrideUrl?: string, skipRetry: boolean = false): Promise<SavedPhoto | null> => {
    if (!id) return null;

    // Check server storage first (fastest)
    const localPhoto = await getPhotoFromServer(id);
    if (localPhoto) {
        try {
            localPhoto.dataUrl = await toDataUrl(localPhoto.dataUrl);
        } catch (e) {
            console.error('[databaseService] Failed to normalize local photo dataUrl:', e);
        }
        return localPhoto;
    }

    // Otherwise check Google Apps Script
    const maxRetries = skipRetry ? 1 : 4;
    for (let i = 0; i < maxRetries; i++) {
        const result = await callAppsScript('getPhoto', { id }, overrideUrl);
        if (result && result.success && result.photo) {
            const photo = result.photo as SavedPhoto;
            try {
                photo.dataUrl = await toDataUrl(photo.dataUrl);
            } catch (e) {
                console.error('[databaseService] Failed to normalize photo URL to base64:', e);
            }
            // Cache locally for subsequent fast loads
            savePhotoToServer(photo).catch(() => {});
            return photo;
        }

        if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1200));
        }
    }

    return null;
};

export const saveAppConfigToCloud = async (config: AppConfig): Promise<boolean> => {
    const result = await callAppsScript('saveConfig', { config });
    return !!(result && result.success);
};

export const getAppConfigFromCloud = async (): Promise<AppConfig | null> => {
    const result = await callAppsScript('getConfig');
    return (result && result.success) ? result.config : null;
};

export const getPhotosFromCloud = async (): Promise<SavedPhoto[]> => {
    const [appsScriptResult, serverPhotos] = await Promise.all([
        callAppsScript('listPhotos').catch(() => null),
        listPhotosFromServer().catch(() => [])
    ]);

    const photoMap = new Map<string, SavedPhoto>();

    // Add server photos
    for (const p of serverPhotos) {
        if (p && p.id) photoMap.set(p.id, p);
    }

    // Merge Apps Script photos
    if (appsScriptResult && appsScriptResult.success && Array.isArray(appsScriptResult.photos)) {
        for (const p of appsScriptResult.photos) {
            if (p && p.id && !photoMap.has(p.id)) {
                photoMap.set(p.id, p);
            }
        }
    }

    return Array.from(photoMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const deletePhotoFromCloud = async (id: string, adminPassword?: string): Promise<boolean> => {
    const [cloudRes, serverRes] = await Promise.all([
        callAppsScript('deletePhoto', { id, password: adminPassword }).catch(() => ({ success: false })),
        deletePhotoFromServer(id).catch(() => false)
    ]);
    return !!(cloudRes?.success || serverRes);
};

/**
 * Diagnostic tool: Test a Google Apps Script URL via backend proxy
 */
export const testGoogleScriptConnection = async (url: string): Promise<{
    success: boolean;
    statusCode?: number;
    isHtml?: boolean;
    message?: string;
    error?: string;
}> => {
    try {
        const resp = await fetch('/api/cloud/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        return await resp.json();
    } catch (e: any) {
        return {
            success: false,
            error: `Lỗi kết nối máy chủ: ${e.message || String(e)}`
        };
    }
};
