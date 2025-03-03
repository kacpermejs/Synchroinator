import { google } from "googleapis";
import fs from "fs";
import { getOAuthClient } from "./auth";
import { askQuestion } from "./utils";
import { StorageRegistry } from "./storage/StorageRegistry";

async function configureAppCloudFolder() {
  const auth = await getOAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
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

async function uploadFile(filePath: string, cloudId?: string) {
  const auth = await getOAuthClient();
  const drive = google.drive({ version: "v3", auth });

  // Ensure we have the correct folder ID
  let folderId = StorageRegistry.getConfigStorage().load()?.driveRootFolder ?? null;

  if (!folderId) {
    console.log("Google Drive Folder not yet selected...");
    folderId = await configureAppCloudFolder();
  }

  if (!folderId) {
    console.error("No folder selected. Upload aborted.");
    return;
  }

  const fileName = filePath.split("/").pop(); // Extract file name from path

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

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
    response = await drive.files.update({
      fileId: cloudId,
      media: media,
    });
  } else {
    // If file doesn't exist, create a new one
    console.log(`Uploading new file: ${fileName}`);
    response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });
  }

  return response;
}

export { configureAppCloudFolder, uploadFile };
