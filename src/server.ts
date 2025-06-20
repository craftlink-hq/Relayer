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

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('common'));

interface GaslessRequest {
    user: string;
    params: any;
    functionName: string;
    signature: string;
}

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

async function executeGaslessTransaction(data: GaslessRequest) {
    const signer = await getSigner();
    let contract: ethers.Contract;
    let method: string;
    let args: any[];

    switch (data.functionName) {
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
            args = [
                data.user,
                data.params.rootHash,
                data.params.databaseId,
                data.params.budget,
                data.params.deadline,
                data.params.v,
                data.params.r,
                data.params.s
            ];
            break;
        case 'applyForGig':
            contract = new ethers.Contract(process.env.GIG_MARKETPLACE_ADDRESS!, gigMarketplaceABI, signer);
            method = 'applyForGigFor';
            args = [
                data.user,
                data.params.databaseId,
                data.params.deadline,
                data.params.v,
                data.params.r,
                data.params.s
            ];
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
            // const gigId = await gigMarketplace.indexes(data.params.databaseId);
            const info = await gigMarketplace.getGigInfo(data.params.databaseId);
            args = [data.user, info.paymentId];
            break;
        case 'mint':
            contract = new ethers.Contract(process.env.CRAFT_COIN_ADDRESS!, craftCoinABI, signer);
            method = 'mintFor';
            args = [data.user];
            break;
        default:
            throw new Error('Unsupported function');
    }

    const tx = await contract[method](...args);
    const receipt = await tx.wait();
    return {
        success: receipt.status === 1,
        tx,
        message: receipt.status === 1 ? `${data.functionName} executed` : `${data.functionName} failed`
    };
}

function verifySignatureWithEthers(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
}

app.post('/gasless-transaction', async (req: Request, res: Response) => {
    const data: GaslessRequest = req.body;
    const message = JSON.stringify({ functionName: data.functionName, user: data.user, params: data.params });
    const signerAddress = verifySignatureWithEthers(message, data.signature);

    if (signerAddress.toLowerCase() === data.user.toLowerCase()) {
        try {
            const result = await executeGaslessTransaction(data);
            res.status(result.success ? 200 : 500).send(result);
        } catch (error: any) {
            res.status(500).send({ success: false, message: error.reason || 'Transaction failed' });
        }
    } else {
        res.status(400).send({ success: false, message: 'Invalid signature' });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.status(200).send({ message: 'Backend is running!' });
});

// Start the server for local deployment ONLY
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;