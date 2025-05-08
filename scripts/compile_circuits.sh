#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}====================[ Compiling Circuits ]====================${NC}"

# Function to check if previous command succeeded
check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
  fi
}

# Create necessary directories
mkdir -p build
mkdir -p contracts/verifiers

# Compile Pedersen Test Circuit
echo -e "\n${YELLOW}Compiling Pedersen Test Circuit...${NC}"
circom circuits/PedersenTest.circom --r1cs --wasm -o build
check_status

# Compile Pedersen Assert Circuit
echo -e "\n${YELLOW}Compiling Pedersen Assert Circuit...${NC}"
circom circuits/PedersenTestWithAssert.circom --r1cs --wasm -o build
check_status

# Compile Vote Commitment Circuit
echo -e "\n${YELLOW}Compiling Vote Commitment Circuit...${NC}"
circom circuits/vote_commit.circom --r1cs --wasm -o build
check_status

# Generate zkey files for Vote Commitment
echo -e "\n${YELLOW}Generating zkey for Vote Commitment...${NC}"
snarkjs groth16 setup build/vote_commit.r1cs pot12_beacon.ptau build/vote_commit_0000.zkey
check_status
snarkjs zkey contribute build/vote_commit_0000.zkey build/vote_commit_final.zkey -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"
check_status
snarkjs zkey export verificationkey build/vote_commit_final.zkey build/vote_commit_verification_key.json
check_status

# Generate Solidity verifier for Vote Commitment
echo -e "\n${YELLOW}Generating Solidity verifier for Vote Commitment...${NC}"
snarkjs zkey export solidityverifier build/vote_commit_final.zkey contracts/verifiers/VoteCommitVerifier.sol
check_status

# Compile Vote Reveal Circuit
echo -e "\n${YELLOW}Compiling Vote Reveal Circuit...${NC}"
circom circuits/vote_reveal.circom --r1cs --wasm -o build
check_status

# Generate zkey files for Vote Reveal
echo -e "\n${YELLOW}Generating zkey for Vote Reveal...${NC}"
snarkjs groth16 setup build/vote_reveal.r1cs pot12_beacon.ptau build/vote_reveal_0000.zkey
check_status
snarkjs zkey contribute build/vote_reveal_0000.zkey build/vote_reveal_final.zkey -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"
check_status
snarkjs zkey export verificationkey build/vote_reveal_final.zkey build/vote_reveal_verification_key.json
check_status

# Generate Solidity verifier for Vote Reveal
echo -e "\n${YELLOW}Generating Solidity verifier for Vote Reveal...${NC}"
snarkjs zkey export solidityverifier build/vote_reveal_final.zkey contracts/verifiers/VoteRevealVerifier.sol
check_status

echo -e "\n${GREEN}====================[ All Circuits Compiled ]====================${NC}"
echo -e "${GREEN}✓ Pedersen Test Circuit${NC}"
echo -e "${GREEN}✓ Pedersen Assert Circuit${NC}"
echo -e "${GREEN}✓ Vote Commitment Circuit${NC}"
echo -e "${GREEN}✓ Vote Reveal Circuit${NC}"
echo -e "${GREEN}✓ Generated Solidity verifiers${NC}"
echo -e "\n${YELLOW}Summary:${NC}"
echo "- All circuits compiled to WebAssembly"
echo "- Generated R1CS constraints"
echo "- Created proving and verification keys"
echo "- Generated Solidity verifiers in contracts/verifiers/"
echo -e "\n${GREEN}===============================================================${NC}" 