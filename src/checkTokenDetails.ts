import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function checkTokenDetails() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
  const token = new ethers.Contract(
    process.env.TOKEN_ADDRESS!,
    [
      "function name() view returns (string)",
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
      "function nonces(address) view returns (uint256)",
    ],
    provider
  );

  const name = await token.name();
  const domainSeparator = await token.DOMAIN_SEPARATOR();
  const nonce = await token.nonces("0xbf4EE65FE67C291DfC34ffe2455ecA9d97DF9148");

  console.log("Token Name:", name);
  console.log("DOMAIN_SEPARATOR:", domainSeparator);
  console.log("Nonce for 0xbf4EE65FE67C291DfC34ffe2455ecA9d97DF9148:", nonce.toString());
}

checkTokenDetails().catch(console.error);