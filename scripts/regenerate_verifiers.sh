#!/bin/bash
# Script to regenerate verifier contracts for vote_commit and vote_reveal circuits

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========== Regenerating Verifier Contracts ==========${NC}"

# Create directories if they don't exist
mkdir -p contracts/verifiers
mkdir -p build

# Make sure we have the zkey files
if [ ! -f "build/vote_commit_final.zkey" ] || [ ! -f "build/vote_reveal_final.zkey" ]; then
  echo -e "${RED}Error: zkey files not found in build directory${NC}"
  echo "Please run the setup script first: npm run setup"
  exit 1
fi

# Function to regenerate a verifier contract
generate_verifier() {
  circuit=$1
  echo -e "${YELLOW}Regenerating $circuit verifier...${NC}"
  
  # Export verification key
  echo "Exporting verification key..."
  snarkjs zkey export verificationkey build/${circuit}_final.zkey build/${circuit}_verification_key.json
  
  # Generate Solidity verifier
  echo "Generating Solidity verifier..."
  snarkjs zkey export solidityverifier build/${circuit}_final.zkey contracts/verifiers/${circuit}Verifier.sol
  
  # Fix Solidity version
  echo "Fixing Solidity version..."
  sed -i.bak "s/pragma solidity \^0.6.11/pragma solidity \^0.8.0/g" contracts/verifiers/${circuit}Verifier.sol
  
  # Rename contract from Groth16Verifier to match the circuit name
  echo "Renaming contract..."
  sed -i.bak "s/contract Groth16Verifier/contract ${circuit}Verifier/g" contracts/verifiers/${circuit}Verifier.sol
  
  # Clean up backup files
  rm -f contracts/verifiers/${circuit}Verifier.sol.bak
  
  echo -e "${GREEN}✓ ${circuit} verifier contract regenerated${NC}"
}

# Regenerate verifiers
generate_verifier "vote_commit"
generate_verifier "vote_reveal"

echo -e "${GREEN}========== All Verifier Contracts Regenerated ==========${NC}"
echo "You can now run the tests with the new verifier contracts." 