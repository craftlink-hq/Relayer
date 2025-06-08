import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

function validateEnv() {
  const requiredVars = ['USER_PRIVATE_KEY', 'USER_ADDRESS'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
}

async function generateSignature(userAddress: string, tokenURI: string) {
  validateEnv();

  const userPrivateKey = process.env.USER_PRIVATE_KEY!;
  const wallet = new ethers.Wallet(userPrivateKey);

  if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error(`Wallet address (${wallet.address}) does not match userAddress (${userAddress})`);
  }

  const message = JSON.stringify({ user: userAddress, tokenURI });
  const signature = await wallet.signMessage(message);
  console.log('Message:', message);
  console.log('Signature:', signature);
  console.log('Signer Address:', wallet.address);
  return { message, signature, userAddress: wallet.address };
}

const userAddress = process.env.USER_ADDRESS!;
const tokenURI = 'https://metadata-url.com';

generateSignature(userAddress, tokenURI).catch(console.error);