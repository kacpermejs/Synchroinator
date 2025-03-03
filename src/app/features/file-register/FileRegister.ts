import { uploadFile } from "@core/driveService";
import { FileChangeDetector } from "../file-change-detector/FileChangeDetector";
import { StorageRegistry } from "./../../core/storage/StorageRegistry";
import { RegisteredFile } from "../../core/models/RegisteredFile";
import fs from "fs";


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
    
    const existing = this.files.find(file => file.path === filePath);
    const fileStats = fs.statSync(filePath);
    
    const hash = this.changeDetector.computeHash(filePath);
    const lastModification = fileStats.mtimeMs;

    if (!existing) {
      this.files.push({ path: filePath, hash: hash, lastModification: lastModification});
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
      if (file.lastSync && !this.changeDetector.wasFileModified(file)) {
        continue;
      }
      //send if was modified
      nothingToUpload = false;
      this.refreshRegisteredData(file);

      try {
        const response = await uploadFile(file.path);
        console.log(`File ${file.path} uploaded, ID: ${response?.data.id}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.path}: ${error}`);
      }
    }
    if (nothingToUpload)
      console.log("No change");
  }

  refreshRegisteredData(file: RegisteredFile) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ File no longer exists: ${file.path}`);
      return;
    }
  
    const fileStats = fs.statSync(file.path);
    file.hash = this.changeDetector.computeHash(file.path);
    file.lastSync = Date.now();
    file.lastModification = fileStats.mtimeMs;
  
    this.save();
  }
  
}
