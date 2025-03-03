import { AppDataStorage } from "./AppDataStorage";

export interface RequiredConfig {
  driveRootFolder: string;
  syncInterval: number;
}

export interface OptionalConfig {
  preferredFormat?: string;
}

export type Config = RequiredConfig & OptionalConfig;

export const DEFAULT_CONFIG: Partial<OptionalConfig> = {
  preferredFormat: "json",
};

export class SettingsStorage extends AppDataStorage<Partial<Config>> {

  override save(data: Partial<Config>) {
    super.save(data);
    console.log(`Folder ID saved to: ${this.getFullPath()}`);
  }

  override load(): Partial<Config> | null {
    const res = super.load();
    if(!res)
      console.log("Google Drive Folder not yet selected...");
    return res;
  }
}
