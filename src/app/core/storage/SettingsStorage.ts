import fs from "fs";
import { AppDataStorage } from "./AppDataStorage";

interface Config {
  driveRootFolder: string;
}

export class SettingsStorage extends AppDataStorage<Config> {

  save(data: Config) {
    super.save(data);
    console.log(`Folder ID saved to: ${this.getFullPath()}`);
  }

  load(): Config | null {
    const res = super.load();
    if(!res)
      console.log("Google Drive Folder not yet selected...");
    return res;
  }
}
