# Duck Wallet

Duck Wallet is a CLI tool for interacting with the Solana blockchain.
It allows you to:

1. generate keypairs
2. request airdrops
3. send SOL, check balances
4. view transaction history

## Installation

You can install Duck Wallet globally using npm:

```bash
npm install -g duck-wallet
```

## Usage

### 1. Generate a Keypair

Generate a new Solana keypair:

```bash
duck-wallet generate-keypair
```

**Output:**

```
Public Key: <Your Public Key>
Secret Key: [<Array of Secret Key Bytes>]
```

### 2. Request an Airdrop

Request an airdrop of SOL to the generated keypair:

```bash
duck-wallet airdrop --amount <amount_in_sol>
```

**Example:**

```bash
duck-wallet airdrop --amount 1
```

**Output:**

```
Requesting airdrop of 1 SOL to Public Key: <Your Public Key>
Airdrop requested. Transaction Signature: <Transaction Signature>
Airdrop confirmed.
```

### 3. Send SOL

Send SOL to a specified recipient:

```bash
duck-wallet send-sol --to <recipient_public_key> --amount <amount_in_sol>
```

**Example:**

```bash
duck-wallet send-sol --to 5nDkqUY8Mz6CK3mECADVLF8Nkwrgnr98ZeFWiyWvf8GM --amount 0.1
```

**Output:**

```
Sending 0.1 SOL to 5nDkqUY8Mz6CK3mECADVLF8Nkwrgnr98ZeFWiyWvf8GM from Public Key: <Your Public Key>
Transfer successful. Transaction Signature: <Transaction Signature>
```

### 4. Check Balance

Check the balance of the generated keypair:

```bash
duck-wallet balance
```

**Output:**

```
Balance of Public Key <Your Public Key>: <Balance in SOL> SOL
```

### 5. View Transaction History

View the transaction history of the generated keypair:

```bash
duck-wallet history
```

**Output:**

```
Transaction history for Public Key <Your Public Key>:
1. Signature: <Transaction Signature>
   Slot: <Slot Number>
   Block Time: <Block Time>
   Status: <Success/Failed>
2. Signature: <Transaction Signature>
   Slot: <Slot Number>
   Block Time: <Block Time>
   Status: <Success/Failed>
...
```

## Issues

### Too Many Airdrop Requests

If you see the error `429 Too Many Requests`, it means you've requested too many airdrops in a short period. Please wait for a while and try again later.
