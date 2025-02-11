import { getOAuthClient } from "./core/auth";
import { uploadFile } from "./core/driveService";
import { StorageRegistry } from "./core/storage/StorageRegistry";

export class App {

  static async init() {
    console.log("Loading settings");
    StorageRegistry.init();
    console.log("🔑 Authenticating...");
    await getOAuthClient();
  }

  static async run() {
    await this.init();

    // main program loop

    console.log("📤 Uploading file...");
    await uploadFile("test.txt");
    // while(true) {
      

      
    // }
  }
}