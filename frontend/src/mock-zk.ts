/**
 * Mock ZK functionality to allow the frontend to run without requiring
 * the actual Circom and SnarkJS libraries which are challenging to use
 * in a browser environment.
 */

export const mockPoseidon = () => {
  return {
    F: {
      toString: (n: any) => n.toString()
    },
    // Simple mock hash function that mimics the behavior without the actual cryptography
    // This is only for demo/UI testing and should never be used in production
    0: (inputs: any[]) => "0x" + Array.from(inputs).map(x => Number(x).toString(16).padStart(4, '0')).join('')
  };
};

export const mockGroth16 = {
  fullProve: async (input: any, _wasmPath: string, _zkeyPath: string) => {
    // Create a deterministic mock proof based on the input
    const inputStr = JSON.stringify(input);
    const mockValue = Array.from(inputStr)
      .map(c => c.charCodeAt(0))
      .reduce((a, b) => a + b, 0) % 1000;
    
    return {
      proof: {
        pi_a: [`${mockValue}1`, `${mockValue}2`],
        pi_b: [[`${mockValue}3`, `${mockValue}4`], [`${mockValue}5`, `${mockValue}6`]],
        pi_c: [`${mockValue}7`, `${mockValue}8`]
      },
      publicSignals: Object.entries(input)
        .filter(([key]) => key !== 'salt') // Filter out private inputs
        .map(([_, value]) => value)
    };
  }
};

// Export a mock circomlibjs
export const mockCircomlib = {
  buildPoseidon: async () => mockPoseidon()
};

// Export a mock snarkjs
export const mockSnarkjs = {
  groth16: mockGroth16
}; 