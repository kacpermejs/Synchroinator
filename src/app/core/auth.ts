import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import { askQuestion } from "./utils";
import { CREDENTIALS_PATH, SCOPES } from "../config/google.config";
import { StorageRegistry } from "./storage/StorageRegistry";
import { TokenStorage } from "./storage/TokenStorage";

async function getOAuthClient(): Promise<OAuth2Client> {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const tokenStorage = StorageRegistry.getTokenStorage();

  const token = tokenStorage.load()
  if (token) {
    oAuth2Client.setCredentials(token);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    console.log("Authorize this app by visiting:", authUrl);
    const code = await askQuestion("Enter the code from that page: ");
    const newToken = (await oAuth2Client.getToken(code)).tokens;

    tokenStorage.save(newToken);
    console.log("Token stored successfully.");
    oAuth2Client.setCredentials(newToken);
  }

  return oAuth2Client;
}

export { getOAuthClient };
