import { google } from "googleapis";
import fs from "fs";
import { getOAuthClient } from "./auth";
import { askQuestion } from "./utils";
import { SettingsStorageService } from "./settings-storage";

async function listFolders() {
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
    SettingsStorageService.saveFolderId(`${selectedFolder.id}`)
    console.log(`Selected folder: ${selectedFolder.name} (ID: ${selectedFolder.id})`);
    return selectedFolder.id ?? null;
  } else {
    console.log("Invalid selection.");
    return null;
  }
}

async function uploadFile(filePath: string) {
  const auth = await getOAuthClient();
  const drive = google.drive({ version: "v3", auth });

  let folderId = SettingsStorageService.loadFolderId();

  if (!folderId) {
    console.log("Google Drive Folder not yet selected...");
    folderId = await listFolders();
  }

  if (!folderId) {
    console.error("No folder selected. Upload aborted.");
    return;
  }

  const fileMetadata = {
    name: filePath.split("/").pop(),
    parents: [folderId],
  };

  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id",
  });

  console.log("File uploaded, ID:", response.data.id);
}

export { listFolders, uploadFile };
