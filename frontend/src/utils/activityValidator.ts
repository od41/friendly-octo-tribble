import { ethers } from 'ethers';
import { ActivityValidatorABI } from '../contracts/ActivityValidator'; // You'll need to create this

export async function validateActivityOnChain(
  proofHash: string,
  movementData: any,
  contractAddress: string
) {
  try {
    // Connect to provider (assuming MetaMask or similar is available)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Connect to the ActivityValidator contract
    const activityValidator = new ethers.Contract(
      contractAddress,
      ActivityValidatorABI,
      signer
    );

    // Call the validation function on the smart contract
    const tx = await activityValidator.validateActivity(
      proofHash,
      movementData.distance,
      movementData.steps,
      movementData.duration
    );

    // Wait for transaction to be mined
    await tx.wait();

    return true;
  } catch (error) {
    console.error('Failed to validate activity on chain:', error);
    throw error;
  }
} 