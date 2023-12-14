import 'dotenv/config';
import path from 'path';
import { ContractFactory, utils, BigNumber, Contract } from 'ethers'
import {
  deployContract,
  destroyExported,
  createNetwork,
  relay
} from '@axelar-network/axelar-local-dev'
import chains from '../chains.json'
import DexBonus from '../artifacts/contracts/DexBonus.sol/DexBonus.json';

describe('Check Examples Execution', function () {
  before(async () => {
    // Initialize an Polygon network
    const polygon = await createNetwork({
      name: "Polygon",
    });

    // Initialize an fantom network
    const fantom = await createNetwork({
      name: "Fantom",
    });

    // Deploy USDC token on the polygon network
    await polygon.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));

    // Deploy USDC token on the fantom network
    await fantom.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));

    // Extract user wallets for both networks
    const [polygonUserWallet] = polygon.userWallets;
    const [fantomUserWallet] = fantom.userWallets;

    // Mint tokens on src chain (polygon)
    await polygon.giveToken(polygonUserWallet.address, "aUSDC", BigInt(100e6));

    // Get token contracts for both chains
    const aUsdcPolygonContract = await polygon.getTokenContract("aUSDC");
    const aUsdcFantomContract = await fantom.getTokenContract("aUSDC");

    // Log balances before transfer
    console.log(
      (await aUsdcPolygonContract.balanceOf(polygonUserWallet.address)) / 1e6,
      "aUSDC in polygon wallet"
    );

    // Log balances before transfer
    console.log(
      (await aUsdcFantomContract.balanceOf(fantomUserWallet.address)) / 1e6,
      "aUSDC in fantom wallet"
    );

    // Approve gateway to use tokens on src chain
    const polygonApproveTx = await aUsdcPolygonContract
      .connect(polygonUserWallet)
      .approve(polygon.gateway.address, 100e6);
    await polygonApproveTx.wait();

    // Request src gateway to send tokens to dest chain
    const polygonGatewayTx = await polygon.gateway
      .connect(polygonUserWallet)
      .sendToken(fantom.name, fantomUserWallet.address, "aUSDC", 100e6);
    await polygonGatewayTx.wait();

    // Relay the transactions
    await relay();

    // Log balances after transfer
    console.log(
      (await aUsdcPolygonContract.balanceOf(polygonUserWallet.address)) / 1e6,
      "aUSDC in polygon wallet"
    );
    // Log balances after transfer
    console.log(
      (await aUsdcFantomContract.balanceOf(fantomUserWallet.address)) / 1e6,
      "aUSDC in fantom wallet"
    );

    const createThreeDeployer = await polygon.deployCreate3Deployer()


    const creationCode = utils.solidityPack(['bytes', 'bytes'], [DexBonus.bytecode, utils.defaultAbiCoder.encode(['address', 'address', 'address'], [aUsdcPolygonContract.address, polygon.gateway.address, polygon.gasService.address])])
    const salt = utils.hexZeroPad(BigNumber.from(101), 32);

    const testAddr = await createThreeDeployer.connect(polygonUserWallet).deploy(creationCode, salt)
    const txReceipt = await testAddr.wait()
    const deployedAddr = txReceipt.events[0].args[2]
    console.log(deployedAddr, 'the deployer addr')
    const dex = new Contract(deployedAddr, DexBonus.abi, polygonUserWallet);
    console.log(await dex.gasService(), 'the dex')




    //deploy polygon
    // await deployContract(polygonUserWallet, DexBonus.abi, [aUsdcPolygonContract.address, polygon.gateway.address, polygon.gasService.address])
    // const dexBonusFantom = await deployContract(polygonUserWallet, DexBonus.abi, [aUsdcFantomContract.address, fantom.gateway.address, fantom.gasService.address])

    // console.log('polygon dexBonus:', dexBonusPolygon.address)
    // console.log('fantom dexBonus:', dexBonusFantom.address)

  })
  describe('EVM Examples', function () {
    it('execute example', async function () {
      console.log('hello')
      //execute on local chains
      // await executeEVMExample('local', chains, [], wallet, example);
    });
  });
});

