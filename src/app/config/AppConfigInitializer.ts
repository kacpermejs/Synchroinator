import { DriveService } from "@core/DriveService";
import { Config, DEFAULT_CONFIG } from "@core/storage/SettingsStorage";
import { StorageRegistry } from "@core/storage/StorageRegistry";
import { askQuestion } from "@core/utils";

type ConfigQuestionResolverFn = (config: Partial<Config>) => Promise<any>;

export interface ConfigQuestion {
  key: keyof Config;
  resolver: ConfigQuestionResolverFn;
}

export const cloudFolderResolver: ConfigQuestionResolverFn = async (config) => {
  let folder = await DriveService.configureAppCloudFolder();
  return folder || null; // Return folder path or null
};

export const syncIntervalResolver: ConfigQuestionResolverFn = async (config) => {
  let interval = await askQuestion("Enter Sync Interval (seconds): ");
  let parsed = parseInt(interval, 10);
  
  return !isNaN(parsed) && parsed > 0 ? parsed : null; // Ensure valid number
};

export class AppConfigInitializer {

  static async init() {
    let result = false;
    while (!result) {
      let currentConfig = this.loadConfig();
      result = await this.resolveConfigQuestions(currentConfig);
    }
    console.log("Required configuration complete!");
  }
  
  private static async resolveConfigQuestions(config: Partial<Config>): Promise<boolean> {
    const questions: ConfigQuestion[] = [
      { key: "driveRootFolder", resolver: cloudFolderResolver },
      { key: "syncInterval", resolver: syncIntervalResolver }
    ];
  
    let completed = true; // Assume everything is filled initially
  
    for (const { key, resolver } of questions) {
      if (config[key] === undefined) {
        completed = false; // Found a missing value, marking as incomplete
  
        const result = await resolver(config);
        if (result !== null) {
          config[key] = result;
          this.saveConfig({...DEFAULT_CONFIG, ...config});
          console.log(`Saved '${key}': ${result}`);
        }
      }
    }
  
    // Check if all required fields are now set
    return questions.every(({ key }) => config[key] !== undefined);
  }

  private static saveConfig(config: Partial<Config>) {
    StorageRegistry.getConfigStorage().save(config);
  }

  private static loadConfig() {
    return StorageRegistry.getConfigStorage().load() ?? {};
  }
}