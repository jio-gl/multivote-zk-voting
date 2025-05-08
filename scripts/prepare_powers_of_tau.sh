#!/bin/bash
# Script to prepare the Powers of Tau for zero-knowledge proofs
# Creates the pot16_final.ptau file needed for the tests

# Create build directory if it doesn't exist
mkdir -p build

# Check if the Powers of Tau file already exists
if [ -f "pot16_final.ptau" ]; then
    echo "Powers of Tau file already exists. Skipping generation."
    exit 0
fi

echo "=============== Setting up Powers of Tau ==============="
# We'll generate our own ptau file for testing
# For production, you would use the Hermez trusted setup files

# Start a new powers of tau ceremony (using 16 for vote circuits)
echo "Starting a new powers of tau ceremony..."
snarkjs powersoftau new bn128 16 build/pot16_0000.ptau

# Contribute to the ceremony with entropy from /dev/urandom
echo "Contributing to the ceremony with system entropy..."
snarkjs powersoftau contribute build/pot16_0000.ptau build/pot16_0001.ptau --name="First contribution" -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"

# Verify the protocol so far
echo "Verifying the contribution..."
snarkjs powersoftau verify build/pot16_0001.ptau

# Apply a random beacon from /dev/urandom
echo "Applying a random beacon..."
snarkjs powersoftau beacon build/pot16_0001.ptau build/pot16_beacon.ptau $(head -c 32 /dev/urandom | xxd -ps -c 32) 10

# Prepare phase 2
echo "Preparing for phase 2..."
snarkjs powersoftau prepare phase2 build/pot16_beacon.ptau pot16_final.ptau -v

echo "=============== Powers of Tau setup complete ==============="
echo "pot16_final.ptau has been created and is ready for use in circuit compilation" 