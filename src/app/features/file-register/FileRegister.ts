import { FileChangeDetector } from "../file-change-detector/FileChangeDetector";
import { StorageRegistry } from "./../../core/storage/StorageRegistry";
import { RegisteredFile } from "../../core/models/RegisteredFile";
import fs from "fs";
import { CloudFileStorage } from "../cloud-file-storage/CloudFileStorage";
import { GoogleDriveService } from "@core/services/GoogleDriveService";
import { OnlineFileData } from "./OnlineFileData";
import { ConflictHandler } from "../conflict-handler/ConflictHandler";

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
          this.refreshRegisteredFileAfterUpload(file, response);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.path}: ${error}`);
        throw error;
      }
    }
    if (nothingToUpload) console.log("No change");
  }

  private refreshRegisteredFileAfterUpload(file: RegisteredFile, uploadResponse: any) {
    this.refreshLocalFileInfo(file);
    file.lastSync = this.responseModifiedTime(uploadResponse);
    file.onlineId = uploadResponse?.data.id;

    this.save();
  }

  private refreshLocalFileInfo(file: RegisteredFile) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ File no longer exists: ${file.path}`);
      return;
    }
    file.lastModification = this.changeDetector.getLatestModificationTime(
      file.path
    );
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
      let time = f.appProperties?.localModifiedTime;

      if (!time) {
        console.warn("Incomplete metadata stored in the cloud! Using modifiedTime instead.");
        time = f.modifiedTime ?? undefined;
      }

      if (!time)
        throw Error("Incomplete metadata stored in the cloud!");

      if (!f.id)
        throw Error("Incomplete data!");

      const localFile = this.files.find( local => local.onlineId == f.id);

      const cloudUnixTime = new Date(time).getTime();

      const pendingFile = {
        id: f.id,
        name: f.name,
        modifiedTime: cloudUnixTime,
        upToDate: localFile ? localFile.lastSync == cloudUnixTime : false
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

  getByOnlineId(id: string): RegisteredFile | undefined {
    return this.files.find( (f) => f.onlineId === id);
  }

  async resolveConflicts(files: OnlineFileData[], handler: ConflictHandler) {
    for (let file of files) {
      const localFile = this.files.find(f => f.onlineId == file.id);
      if (localFile) {
        this.refreshLocalFileInfo(localFile);
        this.save();
      }
      await handler.handle(file);
    }
  }

  async sendSelectedFile(localFile: RegisteredFile): Promise<boolean> {
    try {
      const response = await CloudFileStorage.uploadRegisteredFile(localFile);
      console.log(`File ${localFile.path} uploaded, ID: ${response?.data.id}`);
      this.refreshRegisteredFileAfterUpload(localFile, response);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to upload ${localFile.path}: ${error}`);
      return false;
    }
  }

  async safeDownload(localFile: RegisteredFile) {
    console.log(`Making backup of registered file:\n ${localFile.path}`);
    //make backup
    const backupPath = await this.makeBackup();
    console.log(`Backup path ${backupPath}`);
    //download
    console.log(`Downloading cloud file to registered path: \n ${localFile.path}`);
    await this.downloadNewVersion(localFile);

  }

  async makeBackup(): Promise<string> {
    return "<!!!Backup not implemented!!!>"
  }

  async downloadAndRegister(path: string, cloudFile: OnlineFileData) {
    console.log(`Downloading and registering a new file under this path:\n ${path}`);
    //TODO
    //download
    const downloadResult = await CloudFileStorage.downloadAndExtractFile(cloudFile.id, path, true);

    //register new path with existing online id
    this.registerFile(downloadResult.path);
  }

  private async downloadNewVersion(localFile: RegisteredFile) {
    //TODO
    //download
    if (!localFile.onlineId) {
      throw new Error("No cloud file id to download from!");
    }
    const res = await CloudFileStorage.downloadAndExtractFile(localFile.onlineId, localFile.path, true); 
    //refresh file register with new modification/sync date 
    this.refreshRegisteredFileAfterUpload(localFile, res.metadata);
  }

  getPendingFiles() {
    return this.pending;
  }
}
