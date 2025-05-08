# MultiVote Frontend

This folder contains the frontend application for the MultiVote zero-knowledge voting system.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MetaMask browser extension
- A running MultiVote smart contract deployment

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Circuit Files

The application requires compiled circuit files (*.wasm and *.zkey) to generate real zero-knowledge proofs:

1. Generate the circuit files from the root directory:
   ```bash
   cd ..
   npm run generate-verifiers
   ```

2. Check that the files were created:
   ```bash
   ls -la circuits/*_circuit.wasm
   ls -la circuits/*_circuit.zkey
   ```

> **Note:** Without these files, the application will run in "demo mode" with mock proofs that won't be verified on-chain.

### Starting the Application

You can start the application with the provided script:

```bash
./start.sh
```

Or manually:

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage

1. Connect your MetaMask wallet
2. Enter the MultiVote contract address
3. View available ballots
4. Participate in active ballots (commit and reveal votes)
5. View results of finalized ballots

## Demo Mode vs. Full ZK Mode

The application can run in two modes:

1. **Demo Mode** (default if circuit files are missing)
   - Uses mock proofs for demonstration
   - Transactions will fail on-chain verification
   - Useful for UI testing and workflow demonstration

2. **Full ZK Mode** (when circuit files are present)
   - Generates real zero-knowledge proofs
   - Transactions will pass on-chain verification if valid
   - Required for actual voting on a real network

## Important Notes

- Store your vote commitment information securely! You will need it to reveal your vote.
- Make sure your reveal address has enough ETH for gas when revealing votes.
- All zero-knowledge operations happen client-side for maximum privacy.

## Troubleshooting

- If you encounter issues with the ZK proofs, ensure that the circuit files are accessible in the expected locations.
- Check that your contract address is correct and the contract is deployed on the network you're connected to. 