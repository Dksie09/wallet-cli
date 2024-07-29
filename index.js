#!/usr/bin/env node

const { Command } = require('commander');
const { Keypair, Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const program = new Command();

const KEYPAIR_FILE = path.join(__dirname, 'keypair.json');

function generateKeypair() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = Array.from(keypair.secretKey);
    const keypairData = { publicKey, secretKey };

    fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(keypairData));
    return keypairData;
}

function loadKeypair() {
    if (!fs.existsSync(KEYPAIR_FILE)) {
        console.error('No keypair found. Please generate a keypair first using "wallet generate-keypair".');
        process.exit(1);
    }

    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_FILE));
    const secretKey = Uint8Array.from(keypairData.secretKey);
    const keypair = Keypair.fromSecretKey(secretKey);

    return keypair;
}

async function requestAirdropWithRetry(publicKey, amountInSol, maxRetries = 5) {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const amountInLamports = amountInSol * LAMPORTS_PER_SOL;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const airdropSignature = await connection.requestAirdrop(publicKey, amountInLamports);
            await connection.confirmTransaction(airdropSignature);
            return airdropSignature;
        } catch (error) {
            if (error.message.includes('429')) {
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`Server responded with 429 Too Many Requests. Retrying after ${delay}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
            } else {
                throw error;
            }
        }
    }

    throw new Error('Max retries exceeded for airdrop request.');
}

async function sendSol(fromKeypair, toPublicKey, amountInSol) {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const transaction = new Transaction();
    const amountInLamports = amountInSol * LAMPORTS_PER_SOL;

    const balance = await connection.getBalance(fromKeypair.publicKey);
    if (balance < amountInLamports) {
        throw new Error('Insufficient funds.');
    }

    transaction.add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPublicKey,
            lamports: amountInLamports,
        })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    transaction.sign(fromKeypair);

    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
}

async function getBalance(publicKey) {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
}

async function getTransactionHistory(publicKey) {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const confirmedSignatures = await connection.getConfirmedSignaturesForAddress2(publicKey, { limit: 10 });
    const transactions = await Promise.all(
        confirmedSignatures.map(async (signatureInfo) => {
            const tx = await connection.getConfirmedTransaction(signatureInfo.signature);
            return {
                signature: signatureInfo.signature,
                slot: tx.slot,
                blockTime: tx.blockTime,
                status: tx.meta.status,
            };
        })
    );
    return transactions;
}

program
    .command('generate-keypair')
    .description('Generate a new keypair')
    .action(() => {
        const keys = generateKeypair();
        console.log('Public Key:', keys.publicKey);
        console.log('Secret Key:', keys.secretKey);
    });

program
    .command('airdrop')
    .description('Request an airdrop of SOL')
    .option('--amount <amount>', 'Amount of SOL to airdrop', parseFloat)
    .action(async (cmd) => {
        const amount = cmd.amount;
        if (!amount || isNaN(amount)) {
            console.error('Invalid amount specified.');
            process.exit(1);
        }

        const keypair = loadKeypair();
        const publicKey = keypair.publicKey.toBase58();
        console.log(`Requesting airdrop of ${amount} SOL to Public Key: ${publicKey}`);
        try {
            const signature = await requestAirdropWithRetry(keypair.publicKey, amount);
            console.log(`Airdrop requested. Transaction Signature: ${signature}`);
            console.log('Airdrop confirmed.');
        } catch (error) {
            console.error('Airdrop failed:', error);
        }
    });

program
    .command('send-sol')
    .description('Send SOL to a specified address')
    .option('--to <toPublicKey>', 'Recipient public key')
    .option('--amount <amount>', 'Amount of SOL to send', parseFloat)
    .action(async (cmd) => {
        const toPublicKey = cmd.to;
        const amount = cmd.amount;
        if (!toPublicKey || !amount || isNaN(amount)) {
            console.error('Invalid recipient or amount specified.');
            process.exit(1);
        }

        const fromKeypair = loadKeypair();
        console.log(`Sending ${amount} SOL to ${toPublicKey} from Public Key: ${fromKeypair.publicKey.toBase58()}`);
        try {
            const signature = await sendSol(fromKeypair, toPublicKey, amount);
            console.log(`Transfer successful. Transaction Signature: ${signature}`);
        } catch (error) {
            console.error('Transfer failed:', error);
        }
    });

program
    .command('balance')
    .description('Check balance of the generated keypair')
    .action(async () => {
        const keypair = loadKeypair();
        const publicKey = keypair.publicKey.toBase58();
        try {
            const balance = await getBalance(keypair.publicKey);
            console.log(`Balance of Public Key ${publicKey}: ${balance} SOL`);
        } catch (error) {
            console.error('Failed to get balance:', error);
        }
    });

program
    .command('history')
    .description('View transaction history of the generated keypair')
    .action(async () => {
        const keypair = loadKeypair();
        const publicKey = keypair.publicKey.toBase58();
        try {
            const transactions = await getTransactionHistory(keypair.publicKey);
            console.log(`Transaction history for Public Key ${publicKey}:`);
            transactions.forEach((tx, index) => {
                console.log(`${index + 1}. Signature: ${tx.signature}`);
                console.log(`   Slot: ${tx.slot}`);
                console.log(`   Block Time: ${new Date(tx.blockTime * 1000).toLocaleString()}`);
                console.log(`   Status: ${tx.status.err ? 'Failed' : 'Success'}`);
            });
        } catch (error) {
            console.error('Failed to get transaction history:', error);
        }
    });

program.parse(process.argv);
