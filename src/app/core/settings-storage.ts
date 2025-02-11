import fs from "fs";
import path from "path";
import appdataPath from "appdata-path";

const configDir = appdataPath("Synchroinator");
const TOKEN_PATH = path.join(configDir, "token.json");
const CONFIG_PATH = path.join(configDir, "config.json");

// Ensure the directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

export class SettingsStorageService {
  static saveToken(token: object) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    console.log(`Token saved to: ${TOKEN_PATH}`);
  }

  static loadToken(): object | null {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    }
    return null;
  }

  static saveFolderId(folderId: string) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ folderId }, null, 2));
    console.log(`Folder ID saved to: ${CONFIG_PATH}`);
  }

  static loadFolderId(): string | null {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")).folderId ?? null;
    }
    console.log("Google Drive Folder not yet selected...")
    return null;
  }
}
