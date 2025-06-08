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
const certificateAbi_json_1 = __importDefault(require("./certificateAbi.json"));
dotenv.config();
function validateEnv() {
    const requiredVars = ['RPC_URL_LISK', 'PRIVATE_KEY', 'CERTIFICATE_ADDRESS', 'USER_ADDRESS', 'ROLE'];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
}
function whitelistUser() {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnv();
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
        const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers_1.ethers.Contract(process.env.CERTIFICATE_ADDRESS, certificateAbi_json_1.default, wallet);
        const userAddress = process.env.USER_ADDRESS;
        const role = process.env.ROLE; // "FACILITATOR" or "STUDENT"
        let tx;
        if (role === "FACILITATOR") {
            tx = yield contract.addFacilitators([userAddress]);
        }
        else if (role === "STUDENT") {
            tx = yield contract.addStudents([userAddress]);
        }
        else {
            throw new Error(`Invalid role: ${role}. Must be "FACILITATOR" or "STUDENT"`);
        }
        yield tx.wait();
        console.log(`Added ${userAddress} as ${role}`);
    });
}
whitelistUser().catch(console.error);
//# sourceMappingURL=whitelistUser.js.map