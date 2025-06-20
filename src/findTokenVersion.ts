import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function findTokenVersion() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
  const token = new ethers.Contract(
    process.env.TOKEN_ADDRESS!,
    [
      "function name() view returns (string)",
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
    ],
    provider
  );

  const name = await token.name();
  const domainSeparator = await token.DOMAIN_SEPARATOR();
  const chainId = 4202; // Lisk Sepolia
  const verifyingContract = process.env.TOKEN_ADDRESS;

  console.log("Token Name:", name);
  console.log("Contract DOMAIN_SEPARATOR:", domainSeparator);
  console.log("Chain ID:", chainId);
  console.log("Verifying Contract:", verifyingContract);

  // Test standard EIP712Domain with various versions
  const versions = ["1", "2", "", "0", "v1", "v2"];
  for (const version of versions) {
    const computedDomainSeparator = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
            )
          ),
          ethers.keccak256(ethers.toUtf8Bytes(name)),
          ethers.keccak256(ethers.toUtf8Bytes(version)),
          chainId,
          verifyingContract,
        ]
      )
    );
    console.log(`Computed DOMAIN_SEPARATOR for version "${version}":`, computedDomainSeparator);
    if (computedDomainSeparator === domainSeparator) {
      console.log(`Found matching version: "${version}"`);
      return { name, version };
    }
  }

  // Test EIP712Domain without version
  const computedDomainSeparatorNoVersion = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "uint256", "address"],
      [
        ethers.keccak256(
          ethers.toUtf8Bytes("EIP712Domain(string name,uint256 chainId,address verifyingContract)")
        ),
        ethers.keccak256(ethers.toUtf8Bytes(name)),
        chainId,
        verifyingContract,
      ]
    )
  );
  console.log("Computed DOMAIN_SEPARATOR without version:", computedDomainSeparatorNoVersion);
  if (computedDomainSeparatorNoVersion === domainSeparator) {
    console.log("Found matching DOMAIN_SEPARATOR without version");
    return { name, version: null };
  }

  console.log("No matching DOMAIN_SEPARATOR found. Please provide Token contract source.");
  return null;
}

findTokenVersion().catch(console.error);