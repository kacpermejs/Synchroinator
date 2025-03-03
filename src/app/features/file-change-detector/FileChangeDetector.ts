import fs from "fs";
import crypto from 'crypto';
import { RegisteredFile } from "../../core/models/RegisteredFile";

export class FileChangeDetector {

  wasFileModified(registeredFile: RegisteredFile): boolean {
    if (!fs.existsSync(registeredFile.path)) {
      throw new Error(`File does not exist: ${registeredFile.path}`);
    }
    const fileStats = fs.statSync(registeredFile.path);
    
    const modification = fileStats.mtimeMs;
    const lastKnownModification = registeredFile.lastModification;

    return modification > lastKnownModification;
  }

  public computeHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
}
