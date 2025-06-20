const ethers = require("ethers");

function computeDomainSeparator(name: string, version: string, chainId: number, verifyingContract: string): string {
  const domainTypeHash = ethers.keccak256(
    ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
  );
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        domainTypeHash,
        ethers.keccak256(ethers.toUtf8Bytes(name)),
        ethers.keccak256(ethers.toUtf8Bytes(version)),
        chainId,
        verifyingContract,
      ]
    )
  );
}

const tokenName = "CraftCoin";
const chainId = 4202;
const verifyingContract = "0xA5dAf20271D126e826cb204Cc76fabDDE6Ad91aD";
const expectedDomainSeparator = "0x1f18719f38f5fb532ae8aab56310049cbe1329927261e0be6989756b19e60cac";

// List of possible version values to test
const versionCandidates = [
  "", "0", "1", "2", "3", "4", "5", "v1", "v2", "v3", "V1", "V2",
  "version1", "version2", "USD Tethers", "USDT", "lisk", "lisk-sepolia", "Lisk Sepolia", "lsk", "LSK"
];

// Extend with numeric versions (0 to 20) to cover common cases
for (let i = 0; i <= 20; i++) {
  versionCandidates.push(i.toString());
}

console.log("Searching for matching DOMAIN_SEPARATOR...");

let found = false;
for (const version of versionCandidates) {
  const computedDomainSeparator = computeDomainSeparator(tokenName, version, chainId, verifyingContract);
  console.log(`Version "${version}": Computed DOMAIN_SEPARATOR: ${computedDomainSeparator}`);
  
  if (computedDomainSeparator.toLowerCase() === expectedDomainSeparator.toLowerCase()) {
    console.log(`Match found! Version: "${version}"`);
    found = true;
    break;
  }
}

if (!found) {
  console.log("No matching DOMAIN_SEPARATOR found. Possible issues:");
  console.log("- Token name may not be exactly 'USD Tethers'. Try variations (e.g., 'USDTethers', 'USD Tether').");
  console.log("- The contract may use a non-standard EIP-712 domain (e.g., including a salt or different fields).");
  console.log("- Verify the chainId (4202) and verifyingContract address (0xA5dAf202...).");
  console.log("Please provide the Token contract source code for further analysis.");
}