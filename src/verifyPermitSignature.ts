import { ethers } from "ethers";

async function verifyPermitSignature() {
  const digest = "0xceb1120994c137c5a7d8fef9f3dc833fe0b68f0323f9f44c93dc7af6dfd9417d";
  const signature = {
    v: 27,
    r: "0xafb1e98f80cebefe3078a8a27b090681c0f2f5509f151686bbd5ac406ce7d253",
    s: "0x3b870f7cf0ff0ec68a9560244a7633d48ce83c847e995ff6c823807c355d9216",
  };

  const recoveredAddress = ethers.recoverAddress(digest, signature);
  console.log("Recovered Address:", recoveredAddress);
  console.log("Expected Address:", "0xbf4EE65FE67C291DfC34ffe2455ecA9d97DF9148");
}

verifyPermitSignature().catch(console.error);