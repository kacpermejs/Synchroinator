import { FileChangeDetector } from "../file-change-detector/FileChangeDetector";
import { StorageRegistry } from "./../../core/storage/StorageRegistry";
import { RegisteredFile } from "../../core/models/RegisteredFile";
import fs from "fs";
import { CloudFileStorage } from "../cloud-file-storage/CloudFileStorage";
import { GoogleDriveService } from "@core/services/GoogleDriveService";

interface OnlineFileData {
  id: string;
  modifiedTime: number;
  upToDate: boolean;
}

export class FileRegister {
  private files: RegisteredFile[] = [];
  private storage = StorageRegistry.getGameFileRegistryStorage();
  private changeDetector = new FileChangeDetector();

  private pending: OnlineFileData[] = [];

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

    const lastModification =
      this.changeDetector.getLatestModificationTime(filePath);

    const existing = this.files.find((file) => file.path === filePath);

    if (!existing) {
      this.files.push({ path: filePath, lastModification: lastModification });
    }

    this.save();
  }

  public unregisterFile(filePath: string) {
    this.files = this.files.filter((file) => file.path !== filePath);
    this.save();
  }

  public getRegisteredFiles(): RegisteredFile[] {
    return this.files;
  }

  async syncChanged(options?: {withoutUpdate?: boolean}) {
    if (this.files.length === 0) {
      console.log("⚠️ No registered files to upload.");
      return;
    }
    let nothingToUpload = true;
    console.log("Synchronizing files...");
    for (const file of this.files) {
      console.log("Last sync: ", file.lastSync);
      console.log("Was modified: ", this.changeDetector.wasFileModified(file));
      if (!this.changeDetector.wasFileModified(file) && file.lastSync) continue;

      //send if was modified
      nothingToUpload = false;

      try {
        const response = await CloudFileStorage.uploadRegisteredFile(file);
        console.log(`File ${file.path} uploaded, ID: ${response?.data.id}`);

        if (options?.withoutUpdate == undefined || options?.withoutUpdate == false)
          this.refreshRegisteredData(file, response);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.path}: ${error}`);
        throw error;
      }
    }
    if (nothingToUpload) console.log("No change");
  }

  private refreshRegisteredData(file: RegisteredFile, uploadResponse: any) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ File no longer exists: ${file.path}`);
      return;
    }
    file.lastSync = this.responseModifiedTime(uploadResponse);
    file.lastModification = this.changeDetector.getLatestModificationTime(
      file.path
    );
    file.onlineId = uploadResponse?.data.id;

    this.save();
  }

  private responseModifiedTime(uploadResponse: any): number | undefined {
    const time = uploadResponse?.data.appProperties.localModifiedTime;
    if (time)
      return new Date(time).getTime();

    console.log("No time provided, using local Date.now()");
    return Date.now();
  }
  
  async checkIfUpToDate(): Promise<boolean> {
    const fileData = await GoogleDriveService.getFilesMetadata();

    const parsed = fileData?.data.files?.map( f => {
      const time = f.appProperties?.localModifiedTime;

      if (!time)
        throw Error("Incomplete metadata stored in the cloud!");
      if (!f.id)
        throw Error("Incomplete data!");

      const localFile = this.files.filter( local => local.onlineId == f.id)[0];

      const cloudUnixTime = new Date(time).getTime();

      const pendingFile = {
        id: f.id,
        modifiedTime: cloudUnixTime,
        upToDate: localFile.lastSync == cloudUnixTime
      } as OnlineFileData;

      return pendingFile;
    });

    if (!parsed)
      console.log("No files in the cloud yet.");
    else {
      this.pending = parsed?.filter( f => f.upToDate == false);
    }
    return this.pending.length > 0 ? false : true;
  }

  checkIfLocalFilesAreNewer() {
    throw new Error("Method not implemented."); //TODO
  }

  getPendingFiles() {
    return this.pending;
  }
}
