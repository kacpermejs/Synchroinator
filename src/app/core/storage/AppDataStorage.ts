import fs from "fs";
import { StorageRegistry } from "./StorageRegistry";
import path from "path";


export abstract class AppDataStorage<T> {
  private fullPath: string;
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
    this.fullPath = this.createFullPath(filename);
  }

  private createFullPath(file: string) {
    const rootPath = StorageRegistry.configDir;
    if(!rootPath)
      throw new Error("Empty base appdata path!");
    return path.join(rootPath, file)
  }

  getFullPath() {
    return this.fullPath;
  }

  save(data: T) {
    fs.writeFileSync(this.getFullPath(), JSON.stringify(data, null, 2));
  }

  load(): T | null {
    if (fs.existsSync(this.getFullPath())) {
      return JSON.parse(fs.readFileSync(this.getFullPath(), "utf-8")) as T;
    }
    return null;
  }
}
