#!/bin/bash
# Script to clean all build files and generated content

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==================== Cleaning MultiVote Project ====================${NC}"

# Remove build directory
if [ -d "build" ]; then
    echo -e "${YELLOW}Removing build directory...${NC}"
    rm -rf build
    echo -e "${GREEN}✓ Build directory removed${NC}"
fi

# Remove temp directory
if [ -d "temp" ]; then
    echo -e "${YELLOW}Removing temp directory...${NC}"
    rm -rf temp
    echo -e "${GREEN}✓ Temp directory removed${NC}"
fi

# Remove inputs directory (except for test inputs to preserve test functionality)
if [ -d "inputs" ]; then
    echo -e "${YELLOW}Removing inputs directory...${NC}"
    find inputs -type f ! -name 'test_vote_commit_input.json' ! -name 'test_vote_reveal_input.json' -delete
    echo -e "${GREEN}✓ Inputs directory cleaned (preserved test input files)${NC}"
fi

# Remove generated verifier contracts
if [ -d "contracts/verifiers" ]; then
    echo -e "${YELLOW}Removing generated verifier contracts...${NC}"
    rm -f contracts/verifiers/VoteCommitVerifier.sol
    rm -f contracts/verifiers/VoteRevealVerifier.sol
    echo -e "${GREEN}✓ Generated verifier contracts removed${NC}"
fi

# Remove Hardhat artifacts and cache
if [ -d "artifacts" ]; then
    echo -e "${YELLOW}Removing Hardhat artifacts...${NC}"
    rm -rf artifacts
    echo -e "${GREEN}✓ Hardhat artifacts removed${NC}"
fi

if [ -d "cache" ]; then
    echo -e "${YELLOW}Removing Hardhat cache...${NC}"
    rm -rf cache
    echo -e "${GREEN}✓ Hardhat cache removed${NC}"
fi

if [ -d "typechain" ]; then
    echo -e "${YELLOW}Removing TypeChain artifacts...${NC}"
    rm -rf typechain
    echo -e "${GREEN}✓ TypeChain artifacts removed${NC}"
fi

# Remove all Powers of Tau files
echo -e "${YELLOW}Removing Powers of Tau files...${NC}"
rm -f *.ptau
rm -f build/*.ptau
echo -e "${GREEN}✓ Powers of Tau files removed${NC}"

# Remove snarkJS generated files
echo -e "${YELLOW}Removing various zkey files...${NC}"
rm -f *.zkey
rm -f *.wtns
rm -f *.r1cs
rm -f *.sym
rm -f *.wasm
rm -f *.json.zkey
rm -f *.json.wtns
echo -e "${GREEN}✓ zKey and witness files removed${NC}"

# Remove node_modules if --full flag is provided
if [ "$1" == "--full" ]; then
    echo -e "${YELLOW}Removing node_modules directory...${NC}"
    rm -rf node_modules
    echo -e "${GREEN}✓ node_modules removed${NC}"
    
    echo -e "${YELLOW}Removing package-lock.json...${NC}"
    rm -f package-lock.json
    echo -e "${GREEN}✓ package-lock.json removed${NC}"
fi

echo -e "${GREEN}==================== Cleaning Complete ====================${NC}"
echo -e "All generated content has been removed."
echo -e "To reinstall dependencies: ${YELLOW}npm install${NC}"
echo -e "To regenerate verifiers: ${YELLOW}npm run generate-verifiers${NC}"
echo -e "To regenerate inputs: ${YELLOW}npm run generate-inputs${NC}" 