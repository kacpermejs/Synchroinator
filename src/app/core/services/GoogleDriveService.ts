import { drive_v3, google } from "googleapis";
import fs from "fs";
import { getOAuthClient } from "../auth";
import { askQuestion } from "../utils";
import { StorageRegistry } from "../storage/StorageRegistry";
import { OAuth2Client } from "google-auth-library";

export class GoogleDriveService {
  static auth: OAuth2Client;
  static drive: drive_v3.Drive;

  static async init() {
    this.auth = await getOAuthClient();
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }
  
  static async configureAppCloudFolder() {

    const res = await this.drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: "files(id, name)",
    });

    const folders = res.data.files || [];
    if (folders.length === 0) {
      console.log("No folders found.");
      return null;
    }

    console.log("\nAvailable Folders:");
    folders.forEach((folder, index) => console.log(`${index + 1}. ${folder.name} (${folder.id})`));

    const choice = await askQuestion("\nSelect a folder number: ");
    const selectedFolder = folders[parseInt(choice) - 1];

    if (selectedFolder) {
      StorageRegistry.getConfigStorage().save({driveRootFolder: `${selectedFolder.id}`});
      console.log(`Selected folder: ${selectedFolder.name} (ID: ${selectedFolder.id})`);
      return selectedFolder.id ?? null;
    } else {
      console.log("Invalid selection.");
      return null;
    }
  }

  static async uploadFile(filePath: string, cloudId?: string, options?: {modifiedTime?: number}) {

    // Ensure we have the correct folder ID
    let folderId = StorageRegistry.getConfigStorage().load()?.driveRootFolder ?? null;

    if (!folderId) {
      console.log("Google Drive Folder not yet selected...");
      folderId = await this.configureAppCloudFolder();
    }

    if (!folderId) {
      console.error("No folder selected. Upload aborted.");
      return;
    }

    const fileName = filePath.split("/").pop(); // Extract file name from path

    let fileMetadata: any = {
      name: fileName,
      parents: [folderId]
    };
    
    console.log("options");
    console.log(options);

    let customMetadata: any;

    if (options?.modifiedTime) {
      
      const isoString = new Date(options.modifiedTime).toISOString();
      customMetadata = {...customMetadata,
        localModifiedTime: isoString,
      }
    }

    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(filePath),
    };

    let response;
    let fileExists = false;

    if (cloudId) {
      fileExists = true;
    }

    if (fileExists) {
      // If file exists, update it
      console.log(`Updating existing file: ${fileName} (ID: ${cloudId})`);
      response = await this.drive.files.update({
        fileId: cloudId,
        media: media,
        fields: "id, appProperties",
        requestBody: {
          appProperties: customMetadata
        }
      });
    } else {
      // If file doesn't exist, create a new one
      console.log(`Uploading new file: ${fileName}`);
      response = await this.drive.files.create({
        requestBody: {...fileMetadata, appProperties: customMetadata},
        media,
        fields: "id, appProperties",
      });
    }

    return response;
  }
  
  static async listRevisions(fileId: string) {
  
    const revisions = await this.drive.revisions.list({ fileId });
    const revisionList = revisions.data.revisions;
    return revisionList;
  }

  static async getFilesMetadata() {
    let folderId = StorageRegistry.getConfigStorage().load()?.driveRootFolder ?? null;

    if (!folderId) {
      console.log("Google Drive Folder not yet selected...");
      folderId = await this.configureAppCloudFolder();
    }

    if (!folderId) {
      console.error("No folder selected. Upload aborted.");
      return;
    }

    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, appProperties)',
    });
    
    return res;
  }
}
