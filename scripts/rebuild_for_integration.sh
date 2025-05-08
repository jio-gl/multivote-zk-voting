#!/bin/bash
# Script to rebuild everything for the integration test

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========== Rebuilding for Integration Test ==========${NC}"

# Create necessary directories
mkdir -p build
mkdir -p temp
mkdir -p inputs
mkdir -p contracts/verifiers

# Function to check if previous command was successful
check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
  fi
}

# Step 1: Delete existing build artifacts
echo -e "${YELLOW}Removing existing build artifacts...${NC}"
rm -f build/vote_commit.r1cs build/vote_reveal.r1cs
rm -f build/*_final.zkey build/*_0000.zkey build/*_0001.zkey
rm -f build/*_verification_key.json
rm -rf build/vote_commit_js build/vote_reveal_js
rm -f contracts/verifiers/VoteCommitVerifier.sol
rm -f contracts/verifiers/VoteRevealVerifier.sol
check_status

# Step 2: Make sure we have Powers of Tau
if [ ! -f "pot16_final.ptau" ]; then
    echo -e "${YELLOW}Generating Powers of Tau file...${NC}"
    bash scripts/prepare_powers_of_tau.sh
    check_status
else
    echo -e "${GREEN}✓ Powers of Tau file exists${NC}"
fi

# Step 3: Compile the circuits
echo -e "${YELLOW}Compiling vote_commit circuit...${NC}"
circom circuits/vote_commit.circom --r1cs --wasm -o build
check_status

echo -e "${YELLOW}Compiling vote_reveal circuit...${NC}"
circom circuits/vote_reveal.circom --r1cs --wasm -o build
check_status

# Step 4: Generate zkeys
for circuit in "vote_commit" "vote_reveal"
do
    echo -e "${YELLOW}Generating $circuit zkey...${NC}"
    
    # Setup
    snarkjs groth16 setup build/${circuit}.r1cs pot16_final.ptau build/${circuit}_0000.zkey
    check_status
    
    # Contribute
    snarkjs zkey contribute build/${circuit}_0000.zkey build/${circuit}_0001.zkey --name="First contribution" -e="test"
    check_status
    
    # Apply beacon
    snarkjs zkey beacon build/${circuit}_0001.zkey build/${circuit}_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10
    check_status
    
    # Export verification key
    snarkjs zkey export verificationkey build/${circuit}_final.zkey build/${circuit}_verification_key.json
    check_status
    
    echo -e "${GREEN}✓ $circuit zkey generated${NC}"
done

# Step 5: Generate verifier contracts
for circuit in "vote_commit" "vote_reveal"
do
    echo -e "${YELLOW}Generating $circuit verifier contract...${NC}"
    
    # Generate contract
    snarkjs zkey export solidityverifier build/${circuit}_final.zkey contracts/verifiers/${circuit}Verifier.sol
    check_status
    
    # Fix Solidity version
    sed -i.bak 's/pragma solidity \^0.6.11/pragma solidity \^0.8.0/g' contracts/verifiers/${circuit}Verifier.sol
    
    # Rename the contract from Groth16Verifier to match the file name
    sed -i.bak "s/contract Groth16Verifier/contract ${circuit}Verifier/g" contracts/verifiers/${circuit}Verifier.sol
    
    # Clean up backup files
    rm -f contracts/verifiers/${circuit}Verifier.sol.bak
    
    echo -e "${GREEN}✓ $circuit verifier contract generated${NC}"
done

# Step 6: Generate inputs
echo -e "${YELLOW}Generating test inputs...${NC}"
node scripts/generateVoteInputs.js
check_status

echo -e "${GREEN}========== Rebuild Complete ==========${NC}"
echo "You can now run the integration tests with the new setup." 