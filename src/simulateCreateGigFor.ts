import { ethers } from "ethers";
import * as dotenv from "dotenv";
import gigMarketplaceABI from "./abi/gigMarketplaceAbi.json";
import tokenABI from "./abi/tokenAbi.json";

dotenv.config();

function validateEnv() {
  const requiredVars = [
    "USER_PRIVATE_KEY",
    "USER_ADDRESS",
    "RPC_URL_LISK",
    "ENCRYPTED_KEY_JSON",
    "PRIVATE_KEY_PASSWORD",
    "TOKEN_ADDRESS",
    "GIG_MARKETPLACE_ADDRESS",
    "PAYMENT_PROCESSOR_ADDRESS",
  ];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
  }
}

async function getSigner() {
  validateEnv();
  const encryptedJsonKey = process.env.ENCRYPTED_KEY_JSON!;
  const wallet = await ethers.Wallet.fromEncryptedJson(
    encryptedJsonKey,
    process.env.PRIVATE_KEY_PASSWORD!
  );
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
  return wallet.connect(provider);
}

interface GaslessParams {
  [key: string]: any;
}

async function generatePermitSignature(
  userAddress: string,
  userPrivateKey: string,
  tokenAddress: string,
  spenderAddress: string,
  value: string,
  deadline: string,
  provider: ethers.JsonRpcProvider
) {
  const wallet = new ethers.Wallet(userPrivateKey);
  if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error(
      `Wallet address (${wallet.address}) does not match userAddress (${userAddress})`
    );
  }

  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
  const nonce = await tokenContract.nonces(userAddress);
  const name = await tokenContract.name();
  const chainId = (await provider.getNetwork()).chainId;

  const domain = {
    name,
    version: "1", // Adjust if token.version() differs
    chainId: Number(chainId),
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner: userAddress,
    spender: spenderAddress,
    value,
    nonce: nonce.toString(),
    deadline,
  };

  const signature = await wallet.signTypedData(domain, types, message);
  const { v, r, s } = ethers.Signature.from(signature);

  console.log("Permit Domain:", domain);
  console.log("Permit Message:", message);
  console.log("Permit Signature:", signature);
  console.log("Permit Components:", { v, r, s });

  return { v, r, s };
}

async function generateSignature(
  functionName: string,
  userAddress: string,
  params: GaslessParams
) {
  validateEnv();
  const userPrivateKey = process.env.USER_PRIVATE_KEY!;
  const wallet = new ethers.Wallet(userPrivateKey);

  if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error(
      `Wallet address (${wallet.address}) does not match userAddress (${userAddress})`
    );
  }

  const message = JSON.stringify({ functionName, user: userAddress, params });
  const signature = await wallet.signMessage(message);

  console.log("Function Name:", functionName);
  console.log("Gasless Message:", message);
  console.log("Gasless Signature:", signature);
  console.log("Signer Address:", wallet.address);

  return { message, signature, functionName, userAddress: wallet.address, params };
}

async function simulateCreateGigFor() {
  validateEnv();

  const userAddress = process.env.USER_ADDRESS!;
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
  const userPrivateKey = process.env.USER_PRIVATE_KEY!;
  const tokenAddress = process.env.TOKEN_ADDRESS!;
  const paymentProcessorAddress = process.env.PAYMENT_PROCESSOR_ADDRESS!;
  const gigMarketplaceAddress = process.env.GIG_MARKETPLACE_ADDRESS!;

  // Parameters from your logs
  const params: GaslessParams = {
    rootHash: "0xd8586b72e068fb8392906c7426214f61cd351b4dc31d624760550e899f74979e",
    databaseId: "0x5aaeaf50c4dc12e82c1dc40a60a73ad4994a790410dd66191d8ac0ac090ce5bc",
    budget: "150000000", // 150 USDT
    deadline: "1750420487", // From logs
  };

  // Generate Permit signature
  const { v, r, s } = await generatePermitSignature(
    userAddress,
    userPrivateKey,
    tokenAddress,
    paymentProcessorAddress,
    params.budget,
    params.deadline,
    provider
  );

  // Add Permit components to params
  params.v = v;
  params.r = r;
  params.s = s;

  // Generate gasless transaction signature
  const { signature } = await generateSignature("createGig", userAddress, params);

  // Simulate createGigFor
  const signer = await getSigner();
  const contract = new ethers.Contract(
    gigMarketplaceAddress,
    gigMarketplaceABI,
    signer
  );

  console.log("Environment Variables:", {
    TOKEN_ADDRESS: tokenAddress,
    PAYMENT_PROCESSOR_ADDRESS: paymentProcessorAddress,
    GIG_MARKETPLACE_ADDRESS: gigMarketplaceAddress,
  });
  console.log("Relayer Address:", signer.address);

  try {
    const tx = await contract.createGigFor(
      userAddress,
      params.rootHash,
      params.databaseId,
      params.budget,
      params.deadline,
      params.v,
      params.r,
      params.s
    );
    console.log("Transaction:", tx);
    const receipt = await tx.wait();
    console.log("Receipt:", receipt);
  } catch (error: any) {
    console.error("Simulation error:", {
      message: error.message,
      reason: error.reason,
      code: error.code,
      data: error.data,
    });
  }
}

simulateCreateGigFor().catch(console.error);