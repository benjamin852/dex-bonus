# Dex Bonus Challenge

This is the starter code for a bonus challenge for the [SpeedRun Eth Dex Challege](https://speedrunethereum.com/). The objective is to send a single transaction Chain A to Chain B via Axelar. This transaction sends a token from Chain A to Chain B and then swaps it on Chain B to Eth.

## Setup
1. Clone repo
2. Install dependencies `npm i`
3. Setup .env file PRIVATE_KEY='<YOUR_PRIVATE_KEY>'


## Tests
To run the unit tests run `hh test test/DexBonus.test.ts`

## Deploy
To deploy on Fantom run `hh run scripts/deployFantom.ts --network fantom`
To deploy on Polygon run `hh run scripts/deployPolygon.ts --network polygon` 


