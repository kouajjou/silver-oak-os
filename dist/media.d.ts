export declare const UPLOADS_DIR: string;
/**
 * Download a file from Telegram and save it to workspace/uploads/.
 * Returns the local file path.
 *
 * Steps:
 * 1. GET https://api.telegram.org/bot{TOKEN}/getFile?file_id={fileId}
 *    -> response: { ok: true, result: { file_path: "photos/file_123.jpg" } }
 * 2. Download from https://api.telegram.org/file/bot{TOKEN}/{file_path}
 * 3. Save to UPLOADS_DIR/{timestamp}_{sanitized_filename}
 * 4. Return the local path
 */
export declare function downloadMedia(botToken: string, fileId: string, originalFilename?: string): Promise<string>;
/**
 * Build the message text to send to Claude when a photo is received.
 * Claude Code's Read tool can open image files -- just give it the path.
 */
export declare function buildPhotoMessage(localPath: string, caption?: string): string;
/**
 * Build the message text to send to Claude when a document is received.
 */
export declare function buildDocumentMessage(localPath: string, filename: string, caption?: string): string;
/**
 * Build the message text to send to Claude when a video is received.
 * Instructs Claude to use the gemini-api-dev skill for video understanding.
 */
export declare function buildVideoMessage(localPath: string, caption?: string): string;
/**
 * Clean up old files from workspace/uploads/.
 * Deletes files older than maxAgeMs (default: 24 hours).
 */
export declare function cleanupOldUploads(maxAgeMs?: number): void;
//# sourceMappingURL=media.d.ts.map