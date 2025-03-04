import { DriveService } from "@core/DriveService";
import { RegisteredFile } from "@core/models/RegisteredFile";
import archiver from "archiver";
import path from "path";
import fs from "fs";

export class CloudFileStorage {

  static async uploadRegisteredFile(file: RegisteredFile) {
    const fileStats = fs.statSync(file.path);
    if (fileStats.isDirectory()) {
      return this.uploadDirectoryAsZip(file.path, file.onlineId);
    }
    return DriveService.uploadFile(file.path, file.onlineId);
  }
  
  static async uploadDirectoryAsZip(directoryPath: string, cloudId?: string) {
    const zipPath = await this.zipDirectory(directoryPath);
    return await DriveService.uploadFile(zipPath, cloudId);
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