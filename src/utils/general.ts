import { InfuraProvider } from 'ethers'
import { INFURA_KEY } from './config'

export const provider = new InfuraProvider('mainnet', INFURA_KEY)
