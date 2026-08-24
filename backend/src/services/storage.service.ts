import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage Abstraction Interface
 * This ensures we can easily swap to AWS S3, Supabase Storage, or Google Cloud Storage in the future.
 */
export interface IStorageService {
  uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string; filename: string }>;
  getFileBuffer(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
}

// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class LocalStorageService implements IStorageService {
  async uploadFile(file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const key = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, key);
    
    // Write buffer to local disk
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      url: `/uploads/${key}`,
      key,
      filename: file.originalname
    };
  }

  async getFileBuffer(key: string) {
    const filePath = path.join(UPLOADS_DIR, key);
    return await fs.promises.readFile(filePath);
  }

  async deleteFile(key: string) {
    const filePath = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// Export default instance (can conditionally export S3StorageService based on env vars later)
export const storageService = new LocalStorageService();
