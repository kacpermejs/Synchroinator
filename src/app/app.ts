import { AppConfigInitializer } from "@config/AppConfigInitializer";
import { getOAuthClient } from "./core/auth";
import { StorageRegistry } from "./core/storage/StorageRegistry";
import { askQuestion } from "./core/utils";
import { FileRegister } from "./features/file-register/FileRegister";
import { GoogleDriveService } from "@core/services/GoogleDriveService";
import { RevisionManager } from "./features/cloud-file-storage/RevisionManager";

export class App {

  static async init() {
    console.log("Loading settings...");
    StorageRegistry.init();
    console.log("🔑 Authenticating...");
    await getOAuthClient();
    console.log("Initializing Drive Service...")
    await GoogleDriveService.init();
    console.log("Checking configuration...")
    await AppConfigInitializer.init();
  }

  static async run() {
    await this.init();
    const fileRegister = new FileRegister();
    const revisionManager = new RevisionManager();

    // main program loop
    while (true) {
      const command = await askQuestion("Enter command (register, save, rev, list, exit): ");

      switch (command.toLowerCase()) {
        case "register":
          const filePath = await askQuestion("Enter file path to register: ");
          try {
            fileRegister.registerFile(filePath);
            console.log(`✅ Registered file: ${filePath}`);
          } catch (error) {
            console.error(`❌ Error: ${error}`);
          }
          break;

        case "save":
          await fileRegister.syncChanged();
          break;
        
        case "rev":
          await revisionManager.listRevisions(fileRegister);
          break;

        case "list":
          const fileList = await GoogleDriveService.getFilesMetadata();
          console.log(fileList?.data.files);
          break;

        case "check":
          const upToDate = await fileRegister.checkIfUpToDate();
          console.log(upToDate ? "Up to date!" : "You have some desynchronized files!");
          const pendingFiles = fileRegister.getPendingFiles();
          if (pendingFiles.length > 0) {
            console.log(pendingFiles);
          }
          break;
        
        case "silent":
          await fileRegister.syncChanged({withoutUpdate: true});
          break;

        case "exit":
          console.log("👋 Exiting...");
          return;

        default:
          console.log("❌ Invalid command. Try 'register', 'save', or 'exit'.");
      }
    }
  }
}