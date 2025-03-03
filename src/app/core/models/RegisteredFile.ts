export interface RegisteredFile {
  path: string;
  lastSync?: number;
  hash: string;
  lastModification: number;
  onlineId?: string;
}
