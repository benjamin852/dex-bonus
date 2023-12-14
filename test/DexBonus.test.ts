import 'dotenv/config';
import { start } from './utils/Start'
import { getWallet } from '../utils/getWallet';
import { getEVMChains } from './utils/GetChains';
import fs from 'fs-extra';
import path from 'path';
import {
    deployContract,
    destroyExported,
    createNetwork,
    relay
} from '@axelar-network/axelar-local-dev'
import chains from '../chains.json'



describe('Check Examples Execution', function () {
    before(async () => {
        // Initialize an Polygon network
        const polygon = await createNetwork({
            name: "Polygon",
        });

        // Deploy USDC token on the polygonereum network
        await polygon.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));

        // Initialize an fantom network
        const fantom = await createNetwork({
            name: "Fantom",
        });

        // Deploy USDC token on the fantom network
        await fantom.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));

        // Extract user wallets for both polygonereum and fantom networks
        const [polygonUserWallet] = polygon.userWallets;
        const [fantomUserWallet] = fantom.userWallets;

        // Mint tokens on the source chain (polygonereum)
        await polygon.giveToken(polygonUserWallet.address, "aUSDC", BigInt(100e6));

        // Get the token contracts for both polygonereum and fantom networks
        const usdcpolygonContract = await polygon.getTokenContract("aUSDC");
        const usdcfantomContract = await fantom.getTokenContract("aUSDC");

        // Approve the gateway to use tokens on the source chain (polygonereum)
        const polygonApproveTx = await usdcpolygonContract
            .connect(polygonUserWallet)
            .approve(polygon.gateway.address, 100e6);
        await polygonApproveTx.wait();

        // Request the polygonereum gateway to send tokens to the fantom network
        const polygonGatewayTx = await polygon.gateway
            .connect(polygonUserWallet)
            .sendToken(fantom.name, fantomUserWallet.address, "aUSDC", 100e6);
        await polygonGatewayTx.wait();

        // Relay the transactions
        await relay();

        // Log the token balances
        console.log(
            (await usdcpolygonContract.balanceOf(polygonUserWallet.address)) / 1e6,
            "aUSDC in polygonereum wallet"
        );
        console.log(
            (await usdcfantomContract.balanceOf(fantomUserWallet.address)) / 1e6,
            "aUSDC in fantom wallet"
        );

    })
    describe('EVM Examples', function () {
        it('execute example', async function () {
            console.log('hello')
            //execute on local chains
            // await executeEVMExample('local', chains, [], wallet, example);
        });
    });
});