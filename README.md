# # 🏗 ethspeedrun-dex Bonus | 🏰 BuidlGuidl

## 🚩 **Challenge: Dex Challenge Bonus**

This is the starter code for a bonus challenge for the [SpeedRun Eth Dex Challege](https://speedrunethereum.com/challenge/minimum-viable-exchange). The objective is to send a single transaction Chain A to Chain B via Axelar. This transaction sends a token from Chain A to Chain B and then swaps it on Chain B to Eth. 

Note: Instead of using the balloons token as specified in the original challenge, we will use the [aUSDC](https://axelar.network/blog/what-is-axlusdc-and-how-do-you-get-it) for easier integration with Axelar.

`aUSDC` can be obtained at the [Axelar Faucet](https://discord.com/channels/770814806105128977/1002423218772136056)

## Setup
1. Clone repo
2. Install dependencies `npm i`
3. Setup .env file PRIVATE_KEY='<YOUR_PRIVATE_KEY>'
4. Follow challenge as documented 


## Tests
To run the unit tests run `hh test test/DexBonus.test.ts`

## Deploy
To deploy on Fantom run `hh run scripts/deployFantom.ts --network fantom`
To deploy on Polygon run `hh run scripts/deployPolygon.ts --network polygon` 

### ⛳️ **Final Checkpoint: Axelarscan Transaction** 
Once the tests are passing and the contract has been successfully deployed you can trigger the transaction either via Remix or a CLI. If successful you should see a live transaction on the [Axelarscan](https://testnet.axelarscan.io/) block explorer, as documented in the challenge.

A working transaction should look like [this](https://testnet.axelarscan.io/gmp/0x3522e49a65f21a58e245fe52159206395be22d9e4376bacb191c19fe72db7729:6)


### 🥅 Goals / Checks

- [ ] 💸 Transfer funds from one blockchain to the other: When your trigger the `interchainSwap()` function the funds you sent to the contract on the source chain should end up in the destination chain.
- [ ] 🤝 Swap funds on destination chain: Not only will you be sending funds crosschain but you will also automatically execute logic on the destination chain once funds are sent! In this case triggering the the `tokenToEth()` function once funds are received from the source chain. Your aUSDC should be deposited in the contract and your eth balance should have increased.


---

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)

---