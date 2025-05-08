#!/usr/bin/env node

// Function to convert a number to bits (LSB first)
function num2BitsLSB(num, numBits) {
  const bits = [];
  const bigNum = BigInt(num);
  
  for (let i = 0; i < numBits; i++) {
    bits.push(Number((bigNum >> BigInt(i)) & 1n));
  }
  
  return bits;
}

// Function to convert a number to bits (MSB first)
function num2BitsMSB(num, numBits) {
  const bits = [];
  const bigNum = BigInt(num);
  
  for (let i = numBits - 1; i >= 0; i--) {
    bits.push(Number((bigNum >> BigInt(i)) & 1n));
  }
  
  return bits;
}

// Function to convert bits back to a number (LSB first)
function bits2NumLSB(bits) {
  let result = 0n;
  
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 1) {
      result |= (1n << BigInt(i));
    }
  }
  
  return result;
}

// Function to convert bits back to a number (MSB first)
function bits2NumMSB(bits) {
  let result = 0n;
  
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 1) {
      result |= (1n << BigInt(bits.length - 1 - i));
    }
  }
  
  return result;
}

// Test with sample values
const testValues = [10, 20, 30, 255, 256, 1024];
const numBits = 64;

console.log("=== Testing Bit Conversion ===\n");

for (const val of testValues) {
  console.log(`Value: ${val}`);
  
  // LSB first conversion
  const bitsLSB = num2BitsLSB(val, numBits);
  console.log(`LSB first bits: ${bitsLSB.slice(0, 16).join('')}...`);
  console.log(`LSB first significant bits: ${bitsLSB.filter(b => b === 1).length}`);
  
  // MSB first conversion
  const bitsMSB = num2BitsMSB(val, numBits);
  console.log(`MSB first bits: ${bitsMSB.slice(0, 16).join('')}...`);
  console.log(`MSB first significant bits: ${bitsMSB.filter(b => b === 1).length}`);
  
  // Convert back and verify
  const backFromLSB = bits2NumLSB(bitsLSB);
  const backFromMSB = bits2NumMSB(bitsMSB);
  
  console.log(`Converted back from LSB: ${backFromLSB} (${backFromLSB === BigInt(val) ? 'correct' : 'wrong'})`);
  console.log(`Converted back from MSB: ${backFromMSB} (${backFromMSB === BigInt(val) ? 'correct' : 'wrong'})`);
  console.log();
}

// Test with our specific values
const amount_in = 10;
const owner_in = 20;
const salt_in = 30;

console.log("=== Testing Specific Input Values ===\n");

// LSB first for all inputs
const amountBitsLSB = num2BitsLSB(amount_in, 64);
const ownerBitsLSB = num2BitsLSB(owner_in, 64);
const saltBitsLSB = num2BitsLSB(salt_in, 64);

console.log("LSB First Representation:");
console.log(`Amount (${amount_in}) bits: ${amountBitsLSB.join('')}`);
console.log(`Owner (${owner_in}) bits: ${ownerBitsLSB.join('')}`);
console.log(`Salt (${salt_in}) bits: ${saltBitsLSB.join('')}`);

// MSB first for all inputs 
const amountBitsMSB = num2BitsMSB(amount_in, 64);
const ownerBitsMSB = num2BitsMSB(owner_in, 64);
const saltBitsMSB = num2BitsMSB(salt_in, 64);

console.log("\nMSB First Representation:");
console.log(`Amount (${amount_in}) bits: ${amountBitsMSB.join('')}`);
console.log(`Owner (${owner_in}) bits: ${ownerBitsMSB.join('')}`);
console.log(`Salt (${salt_in}) bits: ${saltBitsMSB.join('')}`); 