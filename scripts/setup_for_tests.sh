#!/bin/bash
# Setup script to prepare for tests
# Runs before tests to ensure all necessary files are generated

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}====================[ MultiVote Test Setup ]====================${NC}"

# Create directories if they don't exist
mkdir -p build
mkdir -p temp
mkdir -p inputs

# Step 1: Generate Powers of Tau if needed
if [ ! -f "pot16_final.ptau" ]; then
    echo -e "${YELLOW}Preparing Powers of Tau file...${NC}"
    bash scripts/prepare_powers_of_tau.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error generating Powers of Tau file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Powers of Tau file generated${NC}"
else
    echo -e "${GREEN}✓ Powers of Tau file already exists${NC}"
fi

# Step 2: Compile circuits if needed
for circuit in "vote_commit" "vote_reveal"
do
    if [ ! -f "build/${circuit}.r1cs" ]; then
        echo -e "${YELLOW}Compiling ${circuit} circuit...${NC}"
        circom circuits/${circuit}.circom --r1cs --wasm -o build
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error compiling ${circuit} circuit${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ ${circuit} circuit compiled${NC}"
    else
        echo -e "${GREEN}✓ ${circuit} circuit already compiled${NC}"
    fi
done

# Step 3: Generate zkeys for each circuit if needed
for circuit in "vote_commit" "vote_reveal"
do
    if [ ! -f "build/${circuit}_final.zkey" ]; then
        echo -e "${YELLOW}Generating zkey for ${circuit}...${NC}"
        
        # Setup
        snarkjs groth16 setup build/${circuit}.r1cs pot16_final.ptau build/${circuit}_0000.zkey
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error setting up zkey for ${circuit}${NC}"
            exit 1
        fi
        
        # Contribute using /dev/urandom for entropy
        snarkjs zkey contribute build/${circuit}_0000.zkey build/${circuit}_0001.zkey --name="First contribution" -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error contributing to zkey for ${circuit}${NC}"
            exit 1
        fi
        
        # Apply beacon using /dev/urandom for entropy
        snarkjs zkey beacon build/${circuit}_0001.zkey build/${circuit}_final.zkey $(head -c 32 /dev/urandom | xxd -ps -c 32) 10
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error applying beacon to zkey for ${circuit}${NC}"
            exit 1
        fi
        
        # Export verification key
        snarkjs zkey export verificationkey build/${circuit}_final.zkey build/${circuit}_verification_key.json
        
        echo -e "${GREEN}✓ ${circuit} zkey generated${NC}"
    else
        echo -e "${GREEN}✓ ${circuit} zkey already exists${NC}"
    fi
done

# Step 4: Generate verifier contracts if needed
# Simple mapping of circuit names to contract names
get_contract_name() {
    case "$1" in
        "vote_commit")
            echo "VoteCommitVerifier"
            ;;
        "vote_reveal")
            echo "VoteRevealVerifier"
            ;;
        *)
            echo ""
            ;;
    esac
}

for circuit in "vote_commit" "vote_reveal"
do
    contract_name=$(get_contract_name "$circuit")
    if [ ! -f "contracts/verifiers/${contract_name}.sol" ]; then
        echo -e "${YELLOW}Generating verifier contract for ${circuit}...${NC}"
        
        # Ensure directory exists
        mkdir -p contracts/verifiers
        
        # Generate verifier
        snarkjs zkey export solidityverifier build/${circuit}_final.zkey contracts/verifiers/${contract_name}.sol
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error generating verifier contract for ${circuit}${NC}"
            exit 1
        fi
        
        # Fix Solidity version
        sed -i.bak 's/pragma solidity \^0.6.11/pragma solidity \^0.8.0/g' contracts/verifiers/${contract_name}.sol
        
        # Rename the contract from Groth16Verifier to match the file name
        sed -i.bak "s/contract Groth16Verifier/contract ${contract_name}/g" contracts/verifiers/${contract_name}.sol
        
        # Clean up backup files
        rm -f contracts/verifiers/${contract_name}.sol.bak
        
        echo -e "${GREEN}✓ ${circuit} verifier contract generated${NC}"
    else
        echo -e "${GREEN}✓ ${circuit} verifier contract already exists${NC}"
    fi
done

# Step 5: Generate inputs if needed
if [ ! -f "inputs/vote_commit_input.json" ] || [ ! -f "inputs/vote_reveal_input.json" ]; then
    echo -e "${YELLOW}Generating inputs for testing...${NC}"
    node scripts/generateVoteInputs.js
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error generating inputs${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Test inputs generated${NC}"
else
    echo -e "${GREEN}✓ Test inputs already exist${NC}"
fi

echo -e "${GREEN}====================[ Setup Complete ]====================${NC}"
echo "All files needed for testing have been prepared." 