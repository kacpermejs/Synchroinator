import { AppDataStorage } from "./AppDataStorage";


export class TokenStorage extends AppDataStorage<object> {

  override save(data: object) {
    super.save(data);
    console.log(`Token saved to: ${this.getFullPath()}`);
  }
}
