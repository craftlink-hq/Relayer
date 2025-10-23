import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ethers } from 'ethers';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import tokenABI from './abi/tokenAbi.json';
import registryABI from './abi/registryAbi.json';
import reviewSystemABI from './abi/reviewSystemAbi.json';
import gigMarketplaceABI from './abi/gigMarketplaceAbi.json';
import paymentProcessorABI from './abi/paymentProcessorAbi.json';
import craftCoinABI from './abi/craftCoinAbi.json';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

const allowedOrigins = [
  "http://localhost:3000",
  "https://craftlink-hq.vercel.app",
  "https://craftlink-alpha.vercel.app",
  "https://craftlinkhq.com",
  "https://www.craftlinkhq.com",
  "https://embedded-wallet.thirdweb.com",
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('common'));

interface GaslessRequest {
    user: string;
    params: any;
    functionName: string;
    signature: string;
    nonce: number;
}

// Enhanced nonce tracking with locking mechanism
const nonceTracker: { [user: string]: number } = {};
const nonceLocks: { [user: string]: boolean } = {};

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

async function getSigner() {
    validateEnv();
    const encryptedJsonKey = process.env.ENCRYPTED_KEY_JSON!;
    const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJsonKey, process.env.PRIVATE_KEY_PASSWORD!);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LISK);
    return wallet.connect(provider);
}

async function resetAllowanceIfNeeded(signer: ethers.Signer, user: string, tokenAddress: string, spender: string) {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
    const currentAllowance = await tokenContract.allowance(user, spender);
    if (currentAllowance > 0) {
        await tokenContract.approveFor(user, spender, 0);
    }
}

// Helper function to wait for lock release
async function waitForNonceLock(user: string, maxWaitTime: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (nonceLocks[user] && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (nonceLocks[user]) {
        throw new Error('Nonce lock timeout - another transaction is taking too long');
    }
}

async function executeGaslessTransaction(data: GaslessRequest) {
    const signer = await getSigner();
    let contract: ethers.Contract;
    let method: string;
    let args: any[];

    switch (data.functionName) {
        case 'approveToken':
            contract = new ethers.Contract(process.env.TOKEN_ADDRESS!, tokenABI, signer);
            method = 'approveFor';
            args = [data.user, data.params.spender, data.params.amount];
            break;
        case 'approveCraftCoin':
            contract = new ethers.Contract(process.env.CRAFT_COIN_ADDRESS!, craftCoinABI, signer);
            method = 'approveFor';
            args = [data.user, data.params.spender, data.params.amount];
            break;
        case 'claim':
            contract = new ethers.Contract(process.env.TOKEN_ADDRESS!, tokenABI, signer);
            method = 'claimFor';
            args = [data.user];
            break;
        case 'registerAsArtisan':
            contract = new ethers.Contract(process.env.REGISTRY_ADDRESS!, registryABI, signer);
            method = 'registerAsArtisanFor';
            args = [data.user, data.params.ipfsUrl];
            break;
        case 'registerAsClient':
            contract = new ethers.Contract(process.env.REGISTRY_ADDRESS!, registryABI, signer);
            method = 'registerAsClientFor';
            args = [data.user, data.params.ipfsUrl];
            break;
        case 'submitReview':
            contract = new ethers.Contract(process.env.REVIEW_SYSTEM_ADDRESS!, reviewSystemABI, signer);
            method = 'artisanSubmitReviewFor';
            args = [data.user, data.params.databaseId, data.params.rating, data.params.commentHash];
            break;
        case 'submitClientReview':
            contract = new ethers.Contract(process.env.REVIEW_SYSTEM_ADDRESS!, reviewSystemABI, signer);
            method = 'clientSubmitReviewFor';
            args = [data.user, data.params.databaseId, data.params.rating, data.params.commentHash];
            break;
        case 'createGig':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'createGigFor';
            args = [data.user, data.params.rootHash, data.params.databaseId, data.params.budget];
            break;
        case 'applyForGig':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'applyForGigFor';
            args = [data.user, data.params.databaseId];
            break;
        case 'hireArtisan':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'hireArtisanFor';
            args = [data.user, data.params.databaseId, data.params.artisan];
            break;
        case 'markComplete':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'markCompleteFor';
            args = [data.user, data.params.databaseId];
            break;
        case 'confirmComplete':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'confirmCompleteFor';
            args = [data.user, data.params.databaseId];
            break;
        case 'releaseArtisanFunds':
            contract = new ethers.Contract(process.env.PAYMENT_PROCESSOR_ADDRESS!, paymentProcessorABI, signer);
            method = 'releaseArtisanFundsFor';
            const gigMarketplace = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            const info = await gigMarketplace.getGigInfo(data.params.databaseId);
            args = [data.user, info.paymentId];
            break;
        case 'mint':
            contract = new ethers.Contract(process.env.CRAFT_COIN_ADDRESS!, craftCoinABI, signer);
            method = 'mintFor';
            args = [data.user];
            break;
        case 'closeGig':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'closeGigFor';
            args = [data.user, data.params.databaseId];
            break;
        default:
            throw new Error('Unsupported function');
    }

    const tx = await contract[method](...args);
    const receipt = await tx.wait();

    // Reset allowances for specific functions if not already zero
    if (data.functionName === 'createGig') {
        await resetAllowanceIfNeeded(signer, data.user, process.env.TOKEN_ADDRESS!, process.env.PAYMENT_PROCESSOR_ADDRESS!);
    } else if (data.functionName === 'applyForGig') {
        await resetAllowanceIfNeeded(signer, data.user, process.env.CRAFT_COIN_ADDRESS!, process.env.GIG_MARKETPLACE_ADDRESS!);
    }

    return {
        success: receipt.status === 1,
        tx,
        message: receipt.status === 1 ? `${data.functionName} executed` : `${data.functionName} failed`
    };
}

function verifySignatureWithEthers(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
}

// Enhanced nonce endpoint that reserves the nonce
app.get('/nonce/:user', (req: Request, res: Response) => {
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
app.get('/current-nonce/:user', (req: Request, res: Response) => {
    const user = req.params.user.toLowerCase();
    const currentNonce = nonceTracker[user] || 0;
    
    res.status(200).send({ 
        currentNonce: currentNonce,
        nextNonce: currentNonce + 1,
        timestamp: Date.now()
    });
});

app.post('/gasless-transaction', async (req: Request, res: Response) => {
    const data: GaslessRequest = req.body;
    const userLower = data.user.toLowerCase();
    
    try {
        // Wait for any existing lock to be released
        await waitForNonceLock(userLower);
        
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
        const result = await executeGaslessTransaction(data);
        
        if (result.success) {
            // Update nonce only on successful transaction
            nonceTracker[userLower] = data.nonce;
            res.status(200).send({
                ...result,
                newNonce: data.nonce,
                nextNonce: data.nonce + 1
            });
        } else {
            // Transaction failed but was processed - still update nonce to prevent replay
            nonceTracker[userLower] = data.nonce;
            res.status(500).send({
                ...result,
                newNonce: data.nonce,
                nextNonce: data.nonce + 1
            });
        }
    } catch (error: any) {
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
    } finally {
        // Always release the lock
        delete nonceLocks[userLower];
    }
});

// Debug endpoint to reset nonce for a user (useful for development)
app.post('/reset-nonce/:user', (req: Request, res: Response) => {
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

app.get('/', (req: Request, res: Response) => {
    res.status(200).send({ message: 'Backend is running!' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;