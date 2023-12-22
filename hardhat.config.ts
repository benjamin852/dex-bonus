import dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import chains from './chains.json'
import '@nomicfoundation/hardhat-toolbox'




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
      gas: 6000000, // Use around 4836635 in total.
      chainId: 4002,
      gasPrice: 25000000000, // Check standard gas price at https://gasstation-mumbai.matic.today/
      blockGasLimit: 210000
    },
  },
}

export default config
