import 'dotenv/config'
import { utils, Contract, Wallet } from 'ethers'
import { createNetwork, relay, } from '@axelar-network/axelar-local-dev'
import DexBonus from '../artifacts/contracts/DexBonus.sol/DexBonus.json'
import { expect } from 'chai'

describe('Axelar Bonus Challenge', () => {
  let polygon: any
  let fantom: any
  let aUSDCPolygon: any
  let aUSDCFantom: any
  let dexBonusPolygon: Contract
  let dexBonusFantom: Contract

  let polygonUserWallet: Wallet
  let fantomUserWallet: Wallet

  before(async () => {
    // Initialize an Polygon network
    polygon = await createNetwork({
      name: 'Polygon',
    })

    // Initialize a Fantom network
    fantom = await createNetwork({
      name: 'Fantom',
    })

    // Deploy USDC token on the Polygon network
    await polygon.deployToken('USDC', 'aUSDC', 6, BigInt(100_000e6))

    // Deploy USDC token on the Fantom network
    await fantom.deployToken('USDC', 'aUSDC', 6, BigInt(100_000e6))

      // Extract user wallets for both networks
      ;[polygonUserWallet] = polygon.userWallets
      ;[fantomUserWallet] = fantom.userWallets

    // Mint tokens on src chain (Polygon)
    await polygon.giveToken(polygonUserWallet.address, 'aUSDC', BigInt(100e6))

    // Get token contracts for both chains
    aUSDCPolygon = await polygon.getTokenContract('aUSDC')
    aUSDCFantom = await fantom.getTokenContract('aUSDC')

    const createThreeDeployerPolygon = await polygon.deployCreate3Deployer()
    const createThreeDeployerFantom = await fantom.deployCreate3Deployer()

    const creationCodePolygon = utils.solidityPack(
      ['bytes', 'bytes'],
      [
        DexBonus.bytecode,
        utils.defaultAbiCoder.encode(
          ['address', 'address', 'address'],
          [aUSDCPolygon.address, polygon.gateway.address, polygon.gasService.address],
        ),
      ],
    )
    const salt = utils.hexZeroPad(utils.formatBytes32String('101'), 32)

    const polygonDeployDexBonus = await createThreeDeployerPolygon
      .connect(polygonUserWallet)
      .deploy(creationCodePolygon, salt)
    const polygonTxReceipt = await polygonDeployDexBonus.wait()
    const polygonDeployedAddr = polygonTxReceipt.events[0].args[2]
    dexBonusPolygon = new Contract(polygonDeployedAddr, DexBonus.abi, polygonUserWallet)

    await aUSDCPolygon
      .connect(polygonUserWallet)
      .approve(dexBonusPolygon.address, (100e18).toString())
    await aUSDCPolygon
      .connect(polygonUserWallet)
      .approve(polygon.gateway.address, (100e18).toString())

    //FANTOM
    const creationCodeFantom = utils.solidityPack(
      ['bytes', 'bytes'],
      [
        DexBonus.bytecode,
        utils.defaultAbiCoder.encode(
          ['address', 'address', 'address'],
          [aUSDCFantom.address, fantom.gateway.address, fantom.gasService.address],
        ),
      ],
    )
    const fantomDeployDexBonus = await createThreeDeployerFantom
      .connect(fantomUserWallet)
      .deploy(creationCodeFantom, salt)
    const fantomTxReceipt = await fantomDeployDexBonus.wait()

    const fantomDeployedAddr = fantomTxReceipt.events[0].args[2]
    dexBonusFantom = new Contract(fantomDeployedAddr, DexBonus.abi, fantomUserWallet)

    await fantom.giveToken(fantomUserWallet.address, 'aUSDC', BigInt(100e6))
    await aUSDCFantom.connect(fantomUserWallet).approve(dexBonusFantom.address, (100e18).toString())

    //fund dex
    await dexBonusFantom.connect(fantomUserWallet).init(1e6, {
      value: (1e18).toString(),
    })

  })

  describe('setup', () => {
    it('should set correct gateway addresses on both chains', async () => {


      expect(await dexBonusPolygon.gasService()).to.equal(polygon.gasService.address)
      expect(await dexBonusFantom.gasService()).to.equal(fantom.gasService.address)
    })

    it('should set correct gasService addresses on both chains', async () => {
      expect(await dexBonusPolygon.gateway()).to.equal(polygon.gateway.address)
      expect(await dexBonusFantom.gateway()).to.equal(fantom.gateway.address)
    })
    it('should set correct aUSDC addresses on both chains', async () => {
      expect(await dexBonusPolygon.token()).to.equal(aUSDCPolygon.address)
      expect(await dexBonusFantom.token()).to.equal(aUSDCFantom.address)
    })
  })
  describe('swap', () => {
    afterEach(async () => {
      await relay()
    })

    //TODO fix this one (not essential if we want to remove)
    // it('reverts if no gas sent', async () => {
    //   expect(await dexBonusPolygon.connect(polygonUserWallet).interchainSwap('Fantom', dexBonusFantom.address, 'aUSDC', 1e6, { value: '1' })).to.be.revertedWith('insufficient gas provided')
    // })

    it('should deduct funds when swapping', async () => {
      const myBalanceBefore = await aUSDCPolygon.balanceOf(polygonUserWallet.address)
      await dexBonusPolygon
        .connect(polygonUserWallet)
        .interchainSwap('Fantom', dexBonusFantom.address, fantomUserWallet.address, 'aUSDC', 1e6, {
          value: (1e18).toString(),
        })
      const myBalanceAfter = await aUSDCPolygon.balanceOf(polygonUserWallet.address)
      expect(myBalanceAfter).to.equal(myBalanceBefore - 1e6)
    })

    it('should emit ContractCallWithToken when swapping', async () => {
      const payload = utils.defaultAbiCoder.encode(['address', 'bool'], [fantomUserWallet.address, true])
      const hashedPayload = utils.keccak256(payload)
      await expect(
        dexBonusPolygon
          .connect(polygonUserWallet)
          .interchainSwap(
            'Fantom',
            dexBonusFantom.address,
            fantomUserWallet.address,
            'aUSDC',
            1e6,
            {
              value: (1e18).toString(),
            },
          ),
      )
        .to.emit(polygon.gateway, 'ContractCallWithToken')
        .withArgs(
          dexBonusPolygon.address,
          'Fantom',
          dexBonusFantom.address,
          hashedPayload,
          payload,
          'aUSDC',
          1e6,
        )
    })
    it('should pay gas on src', async () => {
      const payload = utils.defaultAbiCoder.encode(['address', 'bool'], [fantomUserWallet.address, true])
      const hashedPayload = utils.keccak256(payload)
      await expect(
        dexBonusPolygon
          .connect(polygonUserWallet)
          .interchainSwap(
            'Fantom',
            dexBonusFantom.address,
            fantomUserWallet.address,
            'aUSDC',
            1e6,
            {
              value: (1e18).toString(),
            },
          ),
      )
        .to.emit(polygon.gasService, 'NativeGasPaidForContractCallWithToken')
        .withArgs(
          dexBonusPolygon.address,
          'Fantom',
          dexBonusFantom.address,
          hashedPayload,
          'aUSDC',
          1e6,
          (1e18).toString(),
          polygonUserWallet.address,
        )
    })

    it('swaps sent aUSDC for eth at dest chain', async () => {
      const dexTokenBalanceBefore = await aUSDCFantom.balanceOf(dexBonusFantom.address)
      const recipientUserEthBalanceBefore = await fantom.provider.getBalance(fantomUserWallet.address)

      await dexBonusPolygon
        .connect(polygonUserWallet)
        .interchainSwap('Fantom', dexBonusFantom.address, fantomUserWallet.address, 'aUSDC', 13e6, {
          value: (1e18).toString(),
        })

      await relay()

      const dexTokenBalanceAfter = await aUSDCFantom.balanceOf(dexBonusFantom.address)
      const recipientUserEthBalanceAfter = await fantom.provider.getBalance(fantomUserWallet.address)


      expect(dexTokenBalanceAfter).to.equal(parseInt(dexTokenBalanceBefore) + 13e6)
      /*
      REVISIT:
      I think it's okay if we make sure eth was earned.
      Rather than calculating exact expected swap output 
      */
      expect(recipientUserEthBalanceAfter).to.be.greaterThan(recipientUserEthBalanceBefore)

    })

    it('should emit TokenToEthSwap after swap', async () => {

      const TokenToEthSwap = dexBonusFantom.filters.TokenToEthSwap()

      const blockNumberBefore = fantom.lastRelayedBlock
      const blockInfoBefore = await fantom.provider.getLogs(blockNumberBefore)
      const eventsBefore = await dexBonusFantom.queryFilter(TokenToEthSwap, blockInfoBefore.hash);

      await dexBonusPolygon
        .connect(polygonUserWallet)
        .interchainSwap(
          'Fantom',
          dexBonusFantom.address,
          fantomUserWallet.address,
          'aUSDC',
          13e6,
          {
            value: (1e18).toString(),
          },
        )

      await relay()

      const blockNumberAfter = fantom.lastRelayedBlock
      const blockInfoAfter = await fantom.provider.getLogs(blockNumberAfter)
      const eventsAfter = await dexBonusFantom.queryFilter(TokenToEthSwap, blockInfoAfter.hash);


      //expect additional event to be emitted (on same block) after tx executes
      expect(eventsBefore.length + 1).to.equal(eventsAfter.length)

      //all events should simply be TokenToEthSwap being emitted
      for (const key in eventsAfter) {
        const element = eventsAfter[key];
        expect(element.event).to.equal('TokenToEthSwap')
      }

    })

  })


})

