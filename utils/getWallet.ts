import { ethers } from 'hardhat'

export const getWallet = (rpc: string) => {
    const key = process.env.PRIVATE_KEY

    if (!key) { throw new Error('invalid key') }

    const provider = ethers.getDefaultProvider(rpc)
    const wallet = new ethers.Wallet(key, provider);
    const connectedWallet = wallet.connect(provider)

    return connectedWallet
}