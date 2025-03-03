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

  let folderId = StorageRegistry.getConfigStorage().load()?.driveRootFolder ?? null;

  if (!folderId) {
    console.log("Google Drive Folder not yet selected...");
    folderId = await configureAppCloudFolder();
  }

  if (!folderId) {
    console.error("No folder selected. Upload aborted.");
    return;
  }

  const fileName = filePath.split("/").pop();

  const existingFiles = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id)",
  });

  const existingFile = existingFiles.data.files?.[0];

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(filePath),
  };

  let response;
  
  if (existingFile && existingFile.id) {
    console.log(`Updating existing file: ${fileName} (ID: ${existingFile.id})`);
    response = await drive.files.update({
      fileId: existingFile.id,
      media: media
    });
  } else {
    // **3️⃣ Upload a new file**
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
