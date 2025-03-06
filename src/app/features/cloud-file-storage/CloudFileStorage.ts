import { DriveService } from "@core/DriveService";
import { RegisteredFile } from "@core/models/RegisteredFile";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { getLatestModificationTime } from "../file-change-detector/FileChangeDetector";

export class CloudFileStorage {

  static async uploadRegisteredFile(file: RegisteredFile) {
    const modifiedTime = getLatestModificationTime(file.path);

    const fileStats = fs.statSync(file.path);
    if (fileStats.isDirectory()) {
      return this.uploadDirectoryAsZip(file.path, file.onlineId, {modifiedTime});
    }
    return DriveService.uploadFile(file.path, file.onlineId, {modifiedTime});
  }
  
  static async uploadDirectoryAsZip(directoryPath: string, cloudId?: string, options?: {modifiedTime?: number}) {
    const zipPath = await this.zipDirectory(directoryPath);
    return await DriveService.uploadFile(zipPath, cloudId, options);
  }
  
  private static async zipDirectory(sourceDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const zipFileName = path.basename(sourceDir) + ".zip";
      const zipFilePath = path.join(path.dirname(sourceDir), zipFileName);
      
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });
  
      output.on("close", () => resolve(zipFilePath));
      archive.on("error", (err) => reject(err));
  
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}