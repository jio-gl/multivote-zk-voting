# MultiVote

A zero-knowledge proof system for private voting using Circom. This project implements privacy-preserving voting using zero-knowledge proofs.

## TL;DR

Quick setup and test:

```bash
npm install                 # Install dependencies
npm run generate-verifiers  # Generate Solidity verifiers (for real ZK verification)
npm run generate-inputs     # Generate vote commit and reveal inputs
ls -la contracts/verifiers  # Verify verifier contracts were generated (VoteCommitVerifier.sol and VoteRevealVerifier.sol)
npx hardhat compile --force # Compile the generated verifier contracts with force flag
npm run test-all            # Run all tests (both circuits and contracts)
```

> **Important:** Make sure verifier contracts are properly generated in the contracts/verifiers directory before running tests. If any are missing, run `npm run generate-verifiers` again or check for errors during the generation process.

## Overview

MultiVote allows users to:
1. Commit to votes privately
2. Reveal votes with zero-knowledge proofs

Privacy is preserved using Pedersen commitments and zero-knowledge proofs to ensure that voting details remain confidential while still being verifiable.

### Key Benefits

MultiVote offers several significant advantages over traditional voting systems:

1. **No Trusted Party Required**: Unlike many voting systems that require a trusted third party to ensure fairness, MultiVote operates in a fully decentralized manner. The system mathematically guarantees privacy and correctness through zero-knowledge proofs rather than relying on trusted authorities. Only the ceremony of circuit generation needs a trusted party, no active trusted party during operation.

2. **No Merkle Trees Needed**: While many privacy-focused systems rely on Merkle trees for efficient verification, MultiVote uses direct commitment verification, eliminating the complexity and potential vulnerabilities associated with Merkle tree implementations. This results in a simpler, more auditable system with reduced attack surface.

3. **Full Privacy Preservation**: The combination of Pedersen commitments and zero-knowledge proofs ensures that voting choices remain completely private while still being verifiable.

4. **On-chain Verification**: All verifications happen trustlessly on-chain, ensuring that the integrity of the voting process is maintained in a fully transparent manner.

5. **Unlinkable Vote Revelation**: A key strength of this approach is that voters only need a second fresh address to reveal their vote. This address must be unlinkable to their public commit address, providing an additional layer of privacy. This separation of commit and reveal identities makes it virtually impossible to correlate a user's voting patterns or preferences with their public identity, even with sophisticated chain analysis.

## Circuits

The project includes zero-knowledge circuits for voting:

1. **vote_commit.circom**: Allows users to commit to a vote privately.

2. **vote_reveal.circom**: Enables users to reveal their vote with a proof.

## Getting Started

### Installation and Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Clean temporary files (if needed):
   ```bash
   npm run clean
   ```

3. Generate Solidity verifiers (optional):
   ```bash
   npm run generate-verifiers
   ```
   This will create Solidity verifier contracts for all circuits in `contracts/verifiers/`.

### Testing the Complete System

To test the entire system at once:

```bash
npm run test-all
```

This will run both the circuit tests and smart contract tests consecutively.

## Testing

The project includes a comprehensive testing workflow with organized npm commands.

### Quick Testing Commands

| Command | Description |
|---------|-------------|
| `npm run generate-inputs` | Generate vote commit and reveal inputs |
| `npm run test-circuits` | Test all ZK circuits and debugging scripts |
| `npm run test-contracts` | Run Hardhat smart contract tests |
| `npm run test-all` | Run all tests (circuits and contracts) |
| `npm run clean` | Clean up all build files and generated content |
| `npm run clean:full` | Clean everything including node_modules |
| `npm run clean:frontend` | Clean frontend build files |
| `npm run clean:frontend:full` | Clean frontend build files and node_modules |
| `npm run generate-verifiers` | Generate Solidity verifier contracts for all circuits |

### Cleaning the Project

To clean all generated files and build artifacts:

```bash
npm run clean
```

This command:
1. Removes the build directory
2. Removes the temp directory
3. Cleans the inputs directory (preserves test input files)
4. Removes the generated verifier contracts
5. Removes Hardhat artifacts and caches
6. Removes Powers of Tau files and other ZK-related artifacts

For a full clean (including node_modules):

```bash
npm run clean:full
```

To clean only the frontend:

```bash
npm run clean:frontend
```

For a full frontend clean (including node_modules):

```bash
npm run clean:frontend:full
```

### Detailed Testing Workflow

#### Testing Zero-Knowledge Circuits

```bash
npm run test-circuits
```

This command runs the input generation script first, then executes the `./scripts/test_all_circuits.sh` script which:
1. Generates and tests commit and reveal circuits
2. Verifies witness generation for all circuits
3. Runs debugging scripts to validate bit encoding and hashing
4. Cleans up temporary files when done

#### Testing Smart Contracts

```bash
npm run test-contracts
```

This runs the Hardhat test suite which verifies the voting functionality and integration between smart contracts and ZK circuits.

> **Note:** If you want to use real verifiers instead of mocks in the tests, first run `npm run generate-verifiers` before running `npm run test-contracts`. This will generate the necessary Solidity verifier contracts that the tests will use instead of falling back to mock verifiers.

> **Troubleshooting:** If you encounter an error during testing:
> 1. Make sure verifier contracts (VoteCommitVerifier.sol and VoteRevealVerifier.sol) exist in `contracts/verifiers/`
> 2. Run `npx hardhat compile --force` to ensure all contracts are properly compiled
> 3. Check that the Solidity version in the generated verifier contracts matches your project's requirements (should be ^0.8.0)

All temporary files created during testing are stored in the `./temp` directory and cleaned up afterward to keep the project organized.

### Advanced Circuit Testing

If you need more granular control over circuit testing, you can follow these steps:

1. Generate inputs:
   ```bash
   npm run generate-inputs
   ```
   This script generates cryptographic Pedersen commitments for vote commits and reveals.

2. Compile specific circuits:
   ```bash
   circom circuits/vote_commit.circom --r1cs --wasm -o temp
   circom circuits/vote_reveal.circom --r1cs --wasm -o temp
   ```

3. Generate witnesses:
   ```bash
   node temp/vote_commit_js/generate_witness.js temp/vote_commit_js/vote_commit.wasm inputs/vote_commit_input.json temp/vote_commit_witness.wtns
   node temp/vote_reveal_js/generate_witness.js temp/vote_reveal_js/vote_reveal.wasm inputs/vote_reveal_input.json temp/vote_reveal_witness.wtns
   ```

4. Debug specific components:
   ```bash
   node scripts/debugVoteCommit.js
   node scripts/debugVoteReveal.js
   node scripts/debugHash.js
   ```

### Generating Solidity Verifiers

To generate production-ready Solidity verifiers for all circuits:

```bash
npm run generate-verifiers
```

This command:
1. Creates a trusted setup for zero-knowledge proofs (Powers of Tau)
2. Compiles all circuits to R1CS format
3. Generates proving and verification keys
4. Creates ready-to-use Solidity verifier contracts (VoteCommitVerifier.sol and VoteRevealVerifier.sol)
5. Places the verifiers in `contracts/verifiers/` directory

The generated verifiers can be used directly in your smart contracts by importing them.

## Implementation Notes

### Pedersen Hash Commitments

The project uses Pedersen hash commitments to hide vote data while still allowing proofs about that data. A commitment acts like a sealed envelope:

- You can put values inside (vote choice, voter ID, random salt)
- Once sealed, no one can see what's inside
- You can't change the contents without breaking the seal
- Later, you can open it to prove what was inside

These commitments are crucial to the privacy model:
- Public data: only the commitments are stored on-chain
- Private data: vote choice, voter ID, and salt values remain known only to the owner
- Verifiable: despite being private, users can prove statements about the hidden values

A key aspect of the implementation:

- There is a significant difference between the JavaScript and Circom implementations of Pedersen hashing. To ensure the commitments generated in JavaScript match what the circuit expects, we need to:

  1. Convert numbers to bits correctly (using Num2Bits in circom)
  2. Ensure bit order is consistent (LSB first in both implementations)
  3. Use the output directly from the circuit to validate the approach
  
The circuit-generated commitments (rather than JavaScript approximations) are used in the input files.

### Trustless Architecture

Unlike systems that rely on trusted operators or complex cryptographic structures like Merkle trees, MultiVote's approach has several benefits:

1. **Reduced Complexity**: By avoiding Merkle trees, the system has fewer components that could potentially contain bugs or vulnerabilities.

2. **Direct Verification**: Each vote is individually verified through zero-knowledge proofs, without needing to traverse a tree structure or rely on intermediary data.

3. **No Coordinator Required**: The system operates without any central coordinator, making it resistant to censorship and single points of failure.

4. **Simpler Auditing**: The straightforward commitment-verification process makes it easier to audit and reason about the system's security properties.

### Privacy Enhancement

The circuits improve privacy by:
1. Breaking the direct link between identities and votes
2. Preventing graph analysis that could de-anonymize users
3. Making it impossible to determine voting patterns
4. Eliminating reliance on trusted third parties who could compromise privacy
5. **Address Separation**: A key privacy strength is that users can commit votes with one address and reveal with a completely different, unlinkable address. This separation prevents correlation between a user's public identity and their voting activity, even in the face of advanced blockchain analysis.

#### Using Unlinkable Addresses for Revelation

One of the most powerful privacy features of MultiVote is the ability to use different addresses for committing and revealing votes. Here's how it works:

1. A user commits their vote from their primary address (Address A)
2. The same user can later reveal their vote from a completely different address (Address B)
3. No on-chain connection exists between Addresses A and B
4. Even if Address A is known publicly, the vote remains private as long as Address B cannot be linked to it

This approach provides significant privacy benefits compared to traditional voting systems, or even other blockchain voting systems that use the same address for both actions. By requiring a fresh address for revelation that's unlinkable to the commit address, MultiVote makes it virtually impossible to track voting patterns or preferences of specific users.

To maintain maximum privacy, users should follow these best practices:
- Use a completely fresh address for vote revelation
- Never transfer funds directly between commit and reveal addresses
- Ensure metadata (like transaction timing, gas settings) doesn't create patterns that could link the addresses

## License

Apache License 2.0

See the [LICENSE](LICENSE) file for details.