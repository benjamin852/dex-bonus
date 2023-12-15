import 'dotenv/config';
import { utils, BigNumber, Contract } from 'ethers';
import {
  deployContract,
  destroyExported,
  createNetwork,
  relay,
} from '@axelar-network/axelar-local-dev';
import chains from '../chains.json';
import DexBonus from '../artifacts/contracts/DexBonus.sol/DexBonus.json';
import { expect } from 'chai'


describe('Axelar Bonus Challenge', () => {
  let polygon: any;
  let fantom: any;
  let aUSDCPolygon: any;
  let aUSDCFantom: any
  let dexBonusPolygon: Contract;
  let dexBonusFantom: Contract;

  before(async () => {
    // Initialize an Polygon network
    polygon = await createNetwork({
      name: 'Polygon',
    });

    // Initialize a Fantom network
    fantom = await createNetwork({
      name: 'Fantom',
    });

    // Deploy USDC token on the Polygon network
    await polygon.deployToken('USDC', 'aUSDC', 6, BigInt(100_000e6));

    // Deploy USDC token on the Fantom network
    await fantom.deployToken('USDC', 'aUSDC', 6, BigInt(100_000e6));

    // Extract user wallets for both networks
    const [polygonUserWallet] = polygon.userWallets;
    const [fantomUserWallet] = fantom.userWallets;

    // Mint tokens on src chain (Polygon)
    await polygon.giveToken(polygonUserWallet.address, 'aUSDC', BigInt(100e6));

    // Get token contracts for both chains
    aUSDCPolygon = await polygon.getTokenContract('aUSDC');
    aUSDCFantom = await fantom.getTokenContract('aUSDC');

    // ... (commented out code)

    const createThreeDeployerPolygon = await polygon.deployCreate3Deployer();
    const createThreeDeployerFantom = await fantom.deployCreate3Deployer();

    const creationCodePolygon = utils.solidityPack(
      ['bytes', 'bytes'],
      [
        DexBonus.bytecode,
        utils.defaultAbiCoder.encode(
          ['address', 'address', 'address'],
          [
            aUSDCPolygon.address,
            polygon.gateway.address,
            polygon.gasService.address,
          ]
        ),
      ]
    );
    const salt = utils.hexZeroPad(BigNumber.from(101), 32);

    const polygonDeployDexBonus = await createThreeDeployerPolygon
      .connect(polygonUserWallet)
      .deploy(creationCodePolygon, salt);
    const polygonTxReceipt = await polygonDeployDexBonus.wait();
    const polygonDeployedAddr = polygonTxReceipt.events[0].args[2];
    dexBonusPolygon = new Contract(
      polygonDeployedAddr,
      DexBonus.abi,
      polygonUserWallet
    );

    const creationCodeFantom = utils.solidityPack(
      ['bytes', 'bytes'],
      [
        DexBonus.bytecode,
        utils.defaultAbiCoder.encode(
          ['address', 'address', 'address'],
          [
            aUSDCFantom.address,
            fantom.gateway.address,
            fantom.gasService.address,
          ]
        ),
      ]
    );
    const fantomDeployDexBonus = await createThreeDeployerFantom
      .connect(fantomUserWallet)
      .deploy(creationCodeFantom, salt);
    const fantomTxReceipt = await fantomDeployDexBonus.wait();

    const fantomDeployedAddr = fantomTxReceipt.events[0].args[2];
    dexBonusFantom = new Contract(
      fantomDeployedAddr,
      DexBonus.abi,
      fantomUserWallet
    );
  });

  describe('setup', () => {
    it('should set correct gateway addresses on both chains', async () => {
      expect(await dexBonusPolygon.gasService()).to.equal(polygon.gasService.address);
      expect(await dexBonusFantom.gasService()).to.equal(fantom.gasService.address);
    });

    it('should set correct gasService addresses on both chains', async () => {
      expect(await dexBonusPolygon.gateway()).to.equal(polygon.gateway.address);
      expect(await dexBonusFantom.gateway()).to.equal(fantom.gateway.address);
    });
    it('should set correct aUSDC addresses on both chains', async () => {
      expect(await dexBonusPolygon.token()).to.equal(aUSDCPolygon.address);
      expect(await dexBonusFantom.token()).to.equal(aUSDCFantom.address);
    });
  });
  describe('swap', () => {
    it('reverts if no gas sent', async () => {
      // expect( dexBonusPolygon.interchainSwap('Fantom', dexBonusFantom.address, 'aUSDC', 1e6, { value: '0' })).to.be.rever
    })
    it('sends aUSDC from src', async () => {
      //check funds deducted
      //check event emitted ContractCallWithToken
    })
    it('should pay gas on src', async () => {
      //check event emitted NativeGasPaidForContractCallWithToken

    })
    it('swaps sent aUSDC for eth at dest chain', async () => {
      //eth balance increased
      //aUSDC is still 0
      //event is emitted
    })
  })
});
