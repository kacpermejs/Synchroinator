import { askQuestion, askYesNoQuestion } from "@core/utils";
import { FileRegister } from "../file-register/FileRegister";
import { OnlineFileData } from "../file-register/OnlineFileData";
import { RegisteredFile } from "@core/models/RegisteredFile";

enum FileSelection {
  None = 0,
  Local = 1,
  Cloud = 2
}

export class ConflictHandler {
  constructor(private fileRegister: FileRegister) {}

  async handle(cloudFile: OnlineFileData) {

    const localFile = this.fileRegister.getByOnlineId(cloudFile.id);

    let localDateStr: string;
    if (localFile)
      localDateStr = new Date(localFile.lastModification).toString();
    else
      localDateStr = "No local file";

    const cloudDateStr = new Date(cloudFile.modifiedTime);

    console.log(
      `Conflicting files: \n
      File: ${localFile?.path ?? cloudFile.name}\n
      Local file modification date: ${localDateStr} \n
      Cloud file modification date: ${cloudDateStr}\n`
    );

    if (!localFile) {
      await this.handleNewIncomingFile(cloudFile);
    } else {
      let answer: FileSelection = FileSelection.None;
      answer = await this.getFileSelection();
      switch (answer) {
        case FileSelection.Local:
        await this.useLocal(localFile);
        break;
      case FileSelection.Cloud:
        await this.useCloud(localFile);
        break;
        case FileSelection.None:
        console.log("Skipping this file!");
        break;
        
      default:
        console.log("Skipping this file!");
        break;
      }
    }
  }

  async handleNewIncomingFile(cloudFile: OnlineFileData) {
    const saveCloudFile = await askYesNoQuestion("Do you want to save this file? y/N", 'n');
    
    if(saveCloudFile) {
      let path: string | undefined; 
      while (!path) {
        path = await askQuestion('Where to save this file?');
      }
      
      this.fileRegister.downloadAndRegister(path, cloudFile);
    } else {
      console.log("Skipping this file!");
    }
  }

  async useCloud(localFile: RegisteredFile) {
    await this.fileRegister.safeDownload(localFile);
  }

  async useLocal(localFile: RegisteredFile) {
    
    let result = false;
    while (!result) {
      const answer = await askYesNoQuestion("Do you want to send this file now? Y/n", 'y');

      if (answer) {
        console.log(
          'Sending local version to cloud. \n' + 
          'Old versions will be kept in the cloud up to a month'
        );
        result = await this.fileRegister.sendSelectedFile(localFile);
      } else {
        console.log(
          'Skipping this file. \n' + 
          'Invoke check command to do it again later.'
        );
        result = true;
      }
    }
  }

  private async getFileSelection(): Promise<FileSelection> {
    const input = await askQuestion("Select file source (None=0, Local=1, Cloud=2): ");
  
    // Try to parse as a number
    const numericValue = parseInt(input, 10);
    if (!isNaN(numericValue) && numericValue in FileSelection) {
      return numericValue as FileSelection;
    }
  
    // Try to match by name
    const selection = FileSelection[input as keyof typeof FileSelection];
    if (selection !== undefined) {
      return selection;
    }
  
    // Invalid input, default to None
    console.log("Invalid selection, defaulting to None.");
    return FileSelection.None;
  }
}
