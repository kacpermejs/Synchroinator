import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import { askQuestion } from "./utils";
import { CREDENTIALS_PATH, SCOPES, TOKEN_PATH } from "../config/google.config";

async function getOAuthClient(): Promise<OAuth2Client> {

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(token);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    console.log("Authorize this app by visiting:", authUrl);
    const code = await askQuestion("Enter the code from that page: ");
    const token = (await oAuth2Client.getToken(code)).tokens;

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log("Token stored to", TOKEN_PATH);
    oAuth2Client.setCredentials(token);
  }

  return oAuth2Client;
}

export { getOAuthClient };
