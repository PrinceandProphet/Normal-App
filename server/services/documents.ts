import path from "path";
import fs from "fs";
import type { InsertDocument } from "@shared/schema";

export class DocumentService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "uploads");
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveUploadedFile(file: Express.Multer.File): Promise<InsertDocument> {
    const doc: InsertDocument = {
      name: file.originalname,
      path: `/uploads/${file.filename}`,
      type: path.extname(file.originalname).toLowerCase(),
      size: file.size,
    };
    
    return doc;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}

export const documentService = new DocumentService();
