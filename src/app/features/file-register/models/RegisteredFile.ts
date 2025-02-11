export interface RegisteredFile {
  path: string;
  lastSync?: number | null;
  hash: string;
  lastModification: number;
}
