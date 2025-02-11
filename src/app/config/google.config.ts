import dotenv from "dotenv";

dotenv.config();

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

export const CREDENTIALS_PATH = process.env.GOOGLE_DRIVE_CREDENTIALS || "./config/credentials.json";
export const TOKEN_PATH = process.env.GOOGLE_DRIVE_TOKEN || "token.json";
export let FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
