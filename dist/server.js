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
// Enhanced nonce tracking with locking mechanism
const nonceTracker = {};
const nonceLocks = {};
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
// Helper function to wait for lock release
function waitForNonceLock(user_1) {
    return __awaiter(this, arguments, void 0, function* (user, maxWaitTime = 10000) {
        const startTime = Date.now();
        while (nonceLocks[user] && (Date.now() - startTime) < maxWaitTime) {
            yield new Promise(resolve => setTimeout(resolve, 100));
        }
        if (nonceLocks[user]) {
            throw new Error('Nonce lock timeout - another transaction is taking too long');
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
// Enhanced nonce endpoint that reserves the nonce
app.get('/nonce/:user', (req, res) => {
    const user = req.params.user.toLowerCase();
    const currentNonce = nonceTracker[user] || 0;
    const nextNonce = currentNonce + 1;
    res.status(200).send({
        nonce: nextNonce,
        currentNonce: currentNonce,
        timestamp: Date.now()
    });
});
// Alternative endpoint to get current nonce without incrementing
app.get('/current-nonce/:user', (req, res) => {
    const user = req.params.user.toLowerCase();
    const currentNonce = nonceTracker[user] || 0;
    res.status(200).send({
        currentNonce: currentNonce,
        nextNonce: currentNonce + 1,
        timestamp: Date.now()
    });
});
app.post('/gasless-transaction', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const userLower = data.user.toLowerCase();
    try {
        // Wait for any existing lock to be released
        yield waitForNonceLock(userLower);
        // Acquire lock
        nonceLocks[userLower] = true;
        const message = JSON.stringify({
            functionName: data.functionName,
            user: data.user,
            params: data.params,
            nonce: data.nonce
        });
        const signerAddress = verifySignatureWithEthers(message, data.signature);
        if (signerAddress.toLowerCase() !== userLower) {
            throw new Error('Invalid signature');
        }
        // Validate nonce with more flexible logic
        const currentNonce = nonceTracker[userLower] || 0;
        const expectedNonce = currentNonce + 1;
        if (data.nonce < expectedNonce) {
            throw new Error(`Nonce too low. Expected: ${expectedNonce}, Received: ${data.nonce}`);
        }
        if (data.nonce > expectedNonce + 5) { // Allow some tolerance for concurrent requests
            throw new Error(`Nonce too high. Expected: ${expectedNonce}, Received: ${data.nonce}`);
        }
        // Execute the transaction
        const result = yield executeGaslessTransaction(data);
        if (result.success) {
            // Update nonce only on successful transaction
            nonceTracker[userLower] = data.nonce;
            res.status(200).send(Object.assign(Object.assign({}, result), { newNonce: data.nonce, nextNonce: data.nonce + 1 }));
        }
        else {
            // Transaction failed but was processed - still update nonce to prevent replay
            nonceTracker[userLower] = data.nonce;
            res.status(500).send(Object.assign(Object.assign({}, result), { newNonce: data.nonce, nextNonce: data.nonce + 1 }));
        }
    }
    catch (error) {
        console.error(`Transaction error for user ${userLower}:`, error);
        // Only update nonce if it was a valid nonce but transaction failed
        const currentNonce = nonceTracker[userLower] || 0;
        if (data.nonce === currentNonce + 1) {
            nonceTracker[userLower] = data.nonce;
        }
        res.status(500).send({
            success: false,
            message: error.message || error.reason || 'Transaction failed',
            currentNonce: nonceTracker[userLower] || 0,
            nextNonce: (nonceTracker[userLower] || 0) + 1
        });
    }
    finally {
        // Always release the lock
        delete nonceLocks[userLower];
    }
}));
// Debug endpoint to reset nonce for a user (useful for development)
app.post('/reset-nonce/:user', (req, res) => {
    const user = req.params.user.toLowerCase();
    delete nonceTracker[user];
    delete nonceLocks[user];
    res.status(200).send({
        success: true,
        message: `Nonce reset for user ${user}`,
        newNonce: 0,
        nextNonce: 1
    });
});
app.get('/', (req, res) => {
    res.status(200).send({ message: 'Backend is running!' });
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map