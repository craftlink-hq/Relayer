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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const tokenAbi_json_1 = __importDefault(require("./abi/tokenAbi.json"));
const registryAbi_json_1 = __importDefault(require("./abi/registryAbi.json"));
const reviewSystemAbi_json_1 = __importDefault(require("./abi/reviewSystemAbi.json"));
const gigMarketplaceAbi_json_1 = __importDefault(require("./abi/gigMarketplaceAbi.json"));
const paymentProcessorAbi_json_1 = __importDefault(require("./abi/paymentProcessorAbi.json"));
const craftCoinAbi_json_1 = __importDefault(require("./abi/craftCoinAbi.json"));
dotenv.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3005;
const allowedOrigins = ["http://localhost:3000", "https://craftlink-hq.vercel.app", "https://craftlink-alpha.vercel.app", "https://craftlinkhq.com", "https://www.craftlinkhq.com"];
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use((0, morgan_1.default)('common'));
// Persistent nonce tracking
const nonceTracker = {};
function validateEnv() {
    const requiredVars = [
        'RPC_URL_LISK', 'PRIVATE_KEY_PASSWORD', 'ENCRYPTED_KEY_JSON',
        'TOKEN_ADDRESS', 'REGISTRY_ADDRESS', 'REVIEW_SYSTEM_ADDRESS',
        'GIG_MARKETPLACE_ADDRESS', 'PAYMENT_PROCESSOR_ADDRESS', 'CRAFT_COIN_ADDRESS'
    ];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
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
function resetAllowanceIfNeeded(signer, user, tokenAddress, spender) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenContract = new ethers_1.ethers.Contract(tokenAddress, tokenAbi_json_1.default, signer);
        const currentAllowance = yield tokenContract.allowance(user, spender);
        if (currentAllowance > 0) {
            yield tokenContract.approveFor(user, spender, 0);
        }
    });
}
function executeGaslessTransaction(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const signer = yield getSigner();
        let contract;
        let method;
        let args;
        switch (data.functionName) {
            case 'approveToken':
                contract = new ethers_1.ethers.Contract(process.env.TOKEN_ADDRESS, tokenAbi_json_1.default, signer);
                method = 'approveFor';
                args = [data.user, data.params.spender, data.params.amount];
                break;
            case 'approveCraftCoin':
                contract = new ethers_1.ethers.Contract(process.env.CRAFT_COIN_ADDRESS, craftCoinAbi_json_1.default, signer);
                method = 'approveFor';
                args = [data.user, data.params.spender, data.params.amount];
                break;
            case 'claim':
                contract = new ethers_1.ethers.Contract(process.env.TOKEN_ADDRESS, tokenAbi_json_1.default, signer);
                method = 'claimFor';
                args = [data.user];
                break;
            case 'registerAsArtisan':
                contract = new ethers_1.ethers.Contract(process.env.REGISTRY_ADDRESS, registryAbi_json_1.default, signer);
                method = 'registerAsArtisanFor';
                args = [data.user, data.params.ipfsUrl];
                break;
            case 'registerAsClient':
                contract = new ethers_1.ethers.Contract(process.env.REGISTRY_ADDRESS, registryAbi_json_1.default, signer);
                method = 'registerAsClientFor';
                args = [data.user, data.params.ipfsUrl];
                break;
            case 'submitReview':
                contract = new ethers_1.ethers.Contract(process.env.REVIEW_SYSTEM_ADDRESS, reviewSystemAbi_json_1.default, signer);
                method = 'artisanSubmitReviewFor';
                args = [data.user, data.params.databaseId, data.params.rating, data.params.commentHash];
                break;
            case 'submitClientReview':
                contract = new ethers_1.ethers.Contract(process.env.REVIEW_SYSTEM_ADDRESS, reviewSystemAbi_json_1.default, signer);
                method = 'clientSubmitReviewFor';
                args = [data.user, data.params.databaseId, data.params.rating, data.params.commentHash];
                break;
            case 'createGig':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'createGigFor';
                args = [data.user, data.params.rootHash, data.params.databaseId, data.params.budget];
                break;
            case 'applyForGig':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'applyForGigFor';
                args = [data.user, data.params.databaseId];
                break;
            case 'hireArtisan':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'hireArtisanFor';
                args = [data.user, data.params.databaseId, data.params.artisan];
                break;
            case 'markComplete':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'markCompleteFor';
                args = [data.user, data.params.databaseId];
                break;
            case 'confirmComplete':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'confirmCompleteFor';
                args = [data.user, data.params.databaseId];
                break;
            case 'releaseArtisanFunds':
                contract = new ethers_1.ethers.Contract(process.env.PAYMENT_PROCESSOR_ADDRESS, paymentProcessorAbi_json_1.default, signer);
                method = 'releaseArtisanFundsFor';
                const gigMarketplace = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                const info = yield gigMarketplace.getGigInfo(data.params.databaseId);
                args = [data.user, info.paymentId];
                break;
            case 'mint':
                contract = new ethers_1.ethers.Contract(process.env.CRAFT_COIN_ADDRESS, craftCoinAbi_json_1.default, signer);
                method = 'mintFor';
                args = [data.user];
                break;
            case 'closeGig':
                contract = new ethers_1.ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS, gigMarketplaceAbi_json_1.default, signer);
                method = 'closeGigFor';
                args = [data.user, data.params.databaseId];
                break;
            default:
                throw new Error('Unsupported function');
        }
        const tx = yield contract[method](...args);
        const receipt = yield tx.wait();
        // Reset allowances for specific functions if not already zero
        if (data.functionName === 'createGig') {
            yield resetAllowanceIfNeeded(signer, data.user, process.env.TOKEN_ADDRESS, process.env.PAYMENT_PROCESSOR_ADDRESS);
        }
        else if (data.functionName === 'applyForGig') {
            yield resetAllowanceIfNeeded(signer, data.user, process.env.CRAFT_COIN_ADDRESS, process.env.GIG_MARKETPLACE_ADDRESS);
        }
        return {
            success: receipt.status === 1,
            tx,
            message: receipt.status === 1 ? `${data.functionName} executed` : `${data.functionName} failed`
        };
    });
}
function verifySignatureWithEthers(message, signature) {
    return ethers_1.ethers.verifyMessage(message, signature);
}
app.get('/nonce/:user', (req, res) => {
    const user = req.params.user.toLowerCase();
    const currentNonce = nonceTracker[user] || 0;
    res.status(200).send({ nonce: currentNonce + 1 });
});
app.post('/gasless-transaction', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const message = JSON.stringify({ functionName: data.functionName, user: data.user, params: data.params, nonce: data.nonce });
    const signerAddress = verifySignatureWithEthers(message, data.signature);
    if (signerAddress.toLowerCase() !== data.user.toLowerCase()) {
        res.status(400).send({ success: false, message: 'Invalid signature' });
        return;
    }
    // Validate nonce
    const lastNonce = nonceTracker[data.user] || 0;
    if (data.nonce !== lastNonce + 1) {
        res.status(400).send({ success: false, message: 'Invalid or duplicate nonce' });
        return;
    }
    nonceTracker[data.user] = data.nonce;
    try {
        const result = yield executeGaslessTransaction(data);
        res.status(result.success ? 200 : 500).send(result);
    }
    catch (error) {
        res.status(500).send({ success: false, message: error.reason || 'Transaction failed' });
    }
}));
app.get('/', (req, res) => {
    res.status(200).send({ message: 'Backend is running!' });
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map