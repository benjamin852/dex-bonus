import dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import chains from './chains.json'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    polygon: {
      url: chains[0].rpc,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 80001,
    },
    fantom: {
      url: chains[1].rpc,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 4002,
    },
  },
}

export default config
