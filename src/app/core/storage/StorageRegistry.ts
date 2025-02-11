import appdataPath from "appdata-path";
import fs from "fs";
import { AppDataStorage } from "./AppDataStorage";
import { SettingsStorage } from "./SettingsStorage";
import { TokenStorage } from "./TokenStorage";
import { GameSaveStorage } from "./GameSaveStorage";


export class StorageRegistry {
  static configDir?: string;

  static init() {
    this.configDir = appdataPath("Synchroinator");
    // Ensure the directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    this.register(TokenStorage, "token.json");
    this.register(SettingsStorage, "config.json");
    this.register(GameSaveStorage, "gameFileRegistry.json");
  }

  private static storageInstances = new Map<Function, AppDataStorage<any>>();

  static register<T extends AppDataStorage<any>>(key: new (path: string) => T, fileName: string) {
    const instance = new key(fileName); // Create the instance here

    this.storageInstances.set(key, instance);
}

  static get<T extends AppDataStorage<any>>(key: new (path: string) => T): T {
    const instance = this.storageInstances.get(key);
    if (!instance) {
      throw new Error(`Storage class ${key.name} is not registered.`);
    }
    return instance as T;
  }

  static getConfigStorage() {
    return this.get(SettingsStorage);
  }

  static getTokenStorage() {
    return this.get(TokenStorage);
  }

  static getGameFileRegistryStorage() {
    return this.get(GameSaveStorage);
  }
}
