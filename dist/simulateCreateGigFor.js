"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const gigMarketplaceAbi_json_1 = __importDefault(require("./abi/gigMarketplaceAbi.json"));
const tokenAbi_json_1 = __importDefault(require("./abi/tokenAbi.json"));
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
function getSigner() {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnv();
        const encryptedJsonKey = process.env.ENCRYPTED_KEY_JSON;
        const wallet = yield ethers_1.ethers.Wallet.fromEncryptedJson(encryptedJsonKey, process.env.PRIVATE_KEY_PASSWORD);
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
        return wallet.connect(provider);
    });
}
function generatePermitSignature(userAddress, userPrivateKey, tokenAddress, spenderAddress, value, deadline, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const wallet = new ethers_1.ethers.Wallet(userPrivateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error(`Wallet address (${wallet.address}) does not match userAddress (${userAddress})`);
        }
        const tokenContract = new ethers_1.ethers.Contract(tokenAddress, tokenAbi_json_1.default, provider);
        const nonce = yield tokenContract.nonces(userAddress);
        const name = yield tokenContract.name();
        const chainId = (yield provider.getNetwork()).chainId;
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
        const signature = yield wallet.signTypedData(domain, types, message);
        const { v, r, s } = ethers_1.ethers.Signature.from(signature);
        console.log("Permit Domain:", domain);
        console.log("Permit Message:", message);
        console.log("Permit Signature:", signature);
        console.log("Permit Components:", { v, r, s });
        return { v, r, s };
    });
}
function generateSignature(functionName, userAddress, params) {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnv();
        const userPrivateKey = process.env.USER_PRIVATE_KEY;
        const wallet = new ethers_1.ethers.Wallet(userPrivateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error(`Wallet address (${wallet.address}) does not match userAddress (${userAddress})`);
        }
        const message = JSON.stringify({ functionName, user: userAddress, params });
        const signature = yield wallet.signMessage(message);
        console.log("Function Name:", functionName);
        console.log("Gasless Message:", message);
        console.log("Gasless Signature:", signature);
        console.log("Signer Address:", wallet.address);
        return { message, signature, functionName, userAddress: wallet.address, params };
    });
}
function simulateCreateGigFor() {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnv();
        const userAddress = process.env.USER_ADDRESS;
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
        const userPrivateKey = process.env.USER_PRIVATE_KEY;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        const paymentProcessorAddress = process.env.PAYMENT_PROCESSOR_ADDRESS;
        const gigMarketplaceAddress = process.env.GIG_MARKETPLACE_ADDRESS;
        // Parameters from your logs
        const params = {
            rootHash: "0xd8586b72e068fb8392906c7426214f61cd351b4dc31d624760550e899f74979e",
            databaseId: "0x5aaeaf50c4dc12e82c1dc40a60a73ad4994a790410dd66191d8ac0ac090ce5bc",
            budget: "150000000", // 150 USDT
            deadline: "1750420487", // From logs
        };
        // Generate Permit signature
        const { v, r, s } = yield generatePermitSignature(userAddress, userPrivateKey, tokenAddress, paymentProcessorAddress, params.budget, params.deadline, provider);
        // Add Permit components to params
        params.v = v;
        params.r = r;
        params.s = s;
        // Generate gasless transaction signature
        const { signature } = yield generateSignature("createGig", userAddress, params);
        // Simulate createGigFor
        const signer = yield getSigner();
        const contract = new ethers_1.ethers.Contract(gigMarketplaceAddress, gigMarketplaceAbi_json_1.default, signer);
        console.log("Environment Variables:", {
            TOKEN_ADDRESS: tokenAddress,
            PAYMENT_PROCESSOR_ADDRESS: paymentProcessorAddress,
            GIG_MARKETPLACE_ADDRESS: gigMarketplaceAddress,
        });
        console.log("Relayer Address:", signer.address);
        try {
            const tx = yield contract.createGigFor(userAddress, params.rootHash, params.databaseId, params.budget, params.deadline, params.v, params.r, params.s);
            console.log("Transaction:", tx);
            const receipt = yield tx.wait();
            console.log("Receipt:", receipt);
        }
        catch (error) {
            console.error("Simulation error:", {
                message: error.message,
                reason: error.reason,
                code: error.code,
                data: error.data,
            });
        }
    });
}
simulateCreateGigFor().catch(console.error);
//# sourceMappingURL=simulateCreateGigFor.js.map