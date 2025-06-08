import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import certificateABI from './certificateAbi.json';

dotenv.config();

function validateEnv() {
  const requiredVars = ['RPC_URL_LISK', 'PRIVATE_KEY', 'CERTIFICATE_ADDRESS', 'USER_ADDRESS', 'ROLE'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
}

async function whitelistUser() {
  validateEnv();

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(process.env.CERTIFICATE_ADDRESS!, certificateABI, wallet);

  const userAddress = process.env.USER_ADDRESS!;
  const role = process.env.ROLE!; // "FACILITATOR" or "STUDENT"

  let tx;
  if (role === "FACILITATOR") {
    tx = await contract.addFacilitators([userAddress]);
  } else if (role === "STUDENT") {
    tx = await contract.addStudents([userAddress]);
  } else {
    throw new Error(`Invalid role: ${role}. Must be "FACILITATOR" or "STUDENT"`);
  }

  await tx.wait();
  console.log(`Added ${userAddress} as ${role}`);
}

whitelistUser().catch(console.error);