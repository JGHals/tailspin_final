import { GameChainValidator } from './chain-validator';

// Create a singleton instance of the validator to be shared across API routes
export const chainValidator = new GameChainValidator(); 