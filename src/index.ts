import { getOAuthClient } from "./app/core/auth";
import { uploadFile } from "./app/core/driveService";

async function main() {
  console.log("🔑 Authenticating...");
  await getOAuthClient();

  console.log("📤 Uploading file...");
  await uploadFile("test.txt"); // Replace with actual file path
}

main().catch(console.error);
