import { ethers } from "ethers";
import * as fs from "fs-extra";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    if (!process.env.PRIVATE_KEY || !process.env.PRIVATE_KEY_PASSWORD) {
        throw new Error("PRIVATE_KEY and PRIVATE_KEY_PASSWORD must be set in .env");
    }

    try {
        console.log('Starting key encryption...');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        const encryptedJsonKey = await wallet.encrypt(process.env.PRIVATE_KEY_PASSWORD);
        await fs.writeFile('./.encryptedKey.json', encryptedJsonKey);
        console.log('Encrypted key saved to .encryptedKey.json');
    } catch (error) {
        console.error('Encryption failed:', error);
        throw error; // Rethrow to ensure process exits with error code
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });