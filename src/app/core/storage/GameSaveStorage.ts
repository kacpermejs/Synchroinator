import { RegisteredFile } from "@core/models/RegisteredFile";
import { AppDataStorage } from "./AppDataStorage";

export class GameSaveStorage extends AppDataStorage<RegisteredFile[]> {
  save(data: RegisteredFile[]) {
    super.save(data);
    console.log(`Files added to registry!`);
  }

  load(): RegisteredFile[] | null {
    const res = super.load();
    if(!res)
      console.log("No files registered!");
    return res;
  }
}