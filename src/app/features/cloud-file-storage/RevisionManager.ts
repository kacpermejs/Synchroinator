import { DriveService } from "@core/DriveService";
import { FileRegister } from "../file-register/FileRegister";

export class RevisionManager {
  async listRevisions(fileRegister: FileRegister) {
    fileRegister.getRegisteredFiles().forEach(async (f) => {
      if (f.onlineId) {
        const list = await DriveService.listRevisions(f.onlineId);
        const revs = list?.map( (e) => `Id: ${e.id}, Time: ${e.modifiedTime}`);
        console.log(revs);
      }
    })
  }
}