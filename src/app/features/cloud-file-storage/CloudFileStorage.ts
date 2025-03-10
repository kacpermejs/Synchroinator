import { GoogleDriveService } from "@core/services/GoogleDriveService";
import { RegisteredFile } from "@core/models/RegisteredFile";
import archiver from "archiver";
import AdmZip from 'adm-zip';
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
    return GoogleDriveService.uploadFile(file.path, file.onlineId, {modifiedTime});
  }
  
  static async uploadDirectoryAsZip(directoryPath: string, cloudId?: string, options?: {modifiedTime?: number}) {
    const zipPath = await this.zipDirectory(directoryPath);
    const result =  await GoogleDriveService.uploadFile(zipPath, cloudId, options);
    this.deleteFile(zipPath);
    return result
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

  static async downloadAndExtractFile(
    fileId: string,
    downloadPath: string,
    unzip: boolean = false
  ): Promise<{ path: string; metadata: any }> {
    // Step 1: Download the file
    const result = await GoogleDriveService.downloadFile(fileId, downloadPath);
    const metadata = result.metadata;
    const downloadedFilePath = result.path;
  
    // 🔥 Fix: Delete only contents of downloadPath (not the folder itself)
    this.cleanDirectory(downloadPath, downloadedFilePath);
  
    // Step 2: Check if the file needs to be unzipped
    if (unzip && path.extname(downloadedFilePath).toLowerCase() === '.zip') {
      const extractedPath = this.unzipFile(downloadedFilePath, downloadPath);

      this.deleteFile(downloadedFilePath);
  
      return { path: extractedPath, metadata };
    }
  
    console.log("No unzipping needed");
    return { path: downloadedFilePath, metadata };
  }
  
  static cleanDirectory(directory: string, excludeFile: string) {
    try {
      if (!fs.existsSync(directory)) return;
  
      // Read all files in the directory
      const files = fs.readdirSync(directory);
  
      for (const file of files) {
        const filePath = path.join(directory, file);
  
        // 🔥 Skip deleting the downloaded ZIP file
        if (filePath === excludeFile) continue;
  
        // Remove files and folders
        fs.rmSync(filePath, { recursive: true, force: true });
      }
  
      console.log(`Cleaned directory: ${directory}`);
    } catch (error) {
      console.error("Error cleaning directory:", error);
    }
  }
  
  static deleteFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
        console.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
    }
  }

  static unzipFile(zipFilePath: string, destinationPath: string): string {
    try {
      console.log(`Extracting ZIP to: ${destinationPath}`);
  
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(destinationPath, true);
  
      console.log(`File unzipped to: ${destinationPath}`);
      return destinationPath;
    } catch (error) {
      console.error("Error unzipping file:", error);
      throw error;
    }
  }
}