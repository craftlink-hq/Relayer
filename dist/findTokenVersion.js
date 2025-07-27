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
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function findTokenVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
        const token = new ethers_1.ethers.Contract(process.env.TOKEN_ADDRESS, [
            "function name() view returns (string)",
            "function DOMAIN_SEPARATOR() view returns (bytes32)",
        ], provider);
        const name = yield token.name();
        const domainSeparator = yield token.DOMAIN_SEPARATOR();
        const chainId = 4202; // Lisk Sepolia
        const verifyingContract = process.env.TOKEN_ADDRESS;
        console.log("Token Name:", name);
        console.log("Contract DOMAIN_SEPARATOR:", domainSeparator);
        console.log("Chain ID:", chainId);
        console.log("Verifying Contract:", verifyingContract);
        // Test standard EIP712Domain with various versions
        const versions = ["1", "2", "", "0", "v1", "v2"];
        for (const version of versions) {
            const computedDomainSeparator = ethers_1.ethers.keccak256(ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32", "bytes32", "uint256", "address"], [
                ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
                ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(name)),
                ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(version)),
                chainId,
                verifyingContract,
            ]));
            console.log(`Computed DOMAIN_SEPARATOR for version "${version}":`, computedDomainSeparator);
            if (computedDomainSeparator === domainSeparator) {
                console.log(`Found matching version: "${version}"`);
                return { name, version };
            }
        }
        // Test EIP712Domain without version
        const computedDomainSeparatorNoVersion = ethers_1.ethers.keccak256(ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32", "uint256", "address"], [
            ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes("EIP712Domain(string name,uint256 chainId,address verifyingContract)")),
            ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(name)),
            chainId,
            verifyingContract,
        ]));
        console.log("Computed DOMAIN_SEPARATOR without version:", computedDomainSeparatorNoVersion);
        if (computedDomainSeparatorNoVersion === domainSeparator) {
            console.log("Found matching DOMAIN_SEPARATOR without version");
            return { name, version: null };
        }
        console.log("No matching DOMAIN_SEPARATOR found. Please provide Token contract source.");
        return null;
    });
}
findTokenVersion().catch(console.error);
//# sourceMappingURL=findTokenVersion.js.map