import fs from "fs";
import { RegisteredFile } from "../../core/models/RegisteredFile";
import path from "path";
import { log } from "console";

export class FileChangeDetector {

  wasFileModified(registeredFile: RegisteredFile): boolean {
    if (!fs.existsSync(registeredFile.path)) {
      throw new Error(`File does not exist: ${registeredFile.path}`);
    }
    
    const modification = this.getLatestModificationTime(registeredFile.path);
    const lastKnownModification = registeredFile.lastModification;

    log(modification, lastKnownModification);

    return modification > lastKnownModification;
  }

  getLatestModificationTime(directoryPath: string): number {
    return getLatestModificationTime(directoryPath);
  }
}

export function getLatestModificationTime(directoryPath: string): number {
  let latestTime = 0;

  function checkDir(dir: string) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        checkDir(fullPath); // Recursively check subdirectories
      } else {
        latestTime = Math.max(latestTime, Math.floor(stats.mtimeMs)); // Update latest time
      }
    }
  }

  checkDir(directoryPath);
  return latestTime;
}
