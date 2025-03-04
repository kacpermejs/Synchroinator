import { DriveService } from "@core/DriveService";
import { FileChangeDetector } from "../file-change-detector/FileChangeDetector";
import { StorageRegistry } from "./../../core/storage/StorageRegistry";
import { RegisteredFile } from "../../core/models/RegisteredFile";
import fs from "fs";
import path from "path";
import { CloudFileStorage } from "../cloud-file-storage/CloudFileStorage";

export class FileRegister {
  private files: RegisteredFile[] = [];
  private storage = StorageRegistry.getGameFileRegistryStorage();
  private changeDetector = new FileChangeDetector();

  constructor() {

    this.load();
  }

  private load() {
    this.files = this.storage.load() ?? [];
  }

  private save() {
    this.storage.save(this.files);
  }

  public registerFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
  
    const lastModification = this.changeDetector.getLatestModificationTime(filePath);

    const existing = this.files.find(file => file.path === filePath);
  
    if (!existing) {
      this.files.push({ path: filePath, lastModification: lastModification });
    }
  
    this.save();
  }

  public unregisterFile(filePath: string) {
    this.files = this.files.filter(file => file.path !== filePath);
    this.save();
  }

  public getRegisteredFiles(): RegisteredFile[] {
    return this.files;
  }

  async syncChanged() {
    if (this.files.length === 0) {
      console.log("⚠️ No registered files to upload.");
      return;
    }
    let nothingToUpload = true;
    console.log("Synchronizing files...");
    for (const file of this.files) {
      console.log("Last sync: ", file.lastSync)
      console.log("Was modified: ", this.changeDetector.wasFileModified(file))
      if (!this.changeDetector.wasFileModified(file) && file.lastSync)
        continue;

      //send if was modified
      nothingToUpload = false;
      
      try {
        const response = await CloudFileStorage.uploadRegisteredFile(file);
        console.log(`File ${file.path} uploaded, ID: ${response?.data.id}`);
        this.refreshRegisteredData(file, response);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.path}: ${error}`);
        throw error;
      }
    }
    if (nothingToUpload)
      console.log("No change");
  }

  refreshRegisteredData(file: RegisteredFile, uploadResponse: any) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ File no longer exists: ${file.path}`);
      return;
    }
    file.lastSync = Date.now();
    file.lastModification = this.changeDetector.getLatestModificationTime(file.path);
    file.onlineId = uploadResponse?.data.id;
  
    this.save();
  }
}
