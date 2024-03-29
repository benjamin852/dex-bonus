import { ethers } from 'hardhat'
import chains from '../chains.json'
import MockERC20 from '../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json'

import { getWallet } from '../utils/getWallet'

async function main() {

  const connectedWallet = getWallet(chains[0].rpc)
  const dexBonus = await ethers.deployContract('DexBonus', [
    chains[0].aUSDC,
    chains[0].gateway,
    chains[0].gasService,
  ])

  const mockERC20 = new ethers.Contract(
    chains[0].aUSDC,
    MockERC20.abi,
    connectedWallet
  )

  await mockERC20.approve(dexBonus.address, 1e18.toString())

  await mockERC20.approve(dexBonus.target, 1e18.toString())

  console.log(`polygon contract address: ${dexBonus.target}`)
}



main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
