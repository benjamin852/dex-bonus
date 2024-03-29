pragma solidity >=0.8.0 <0.9.0;
// SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title DEX
 * @author stevepham.eth and m00npapi.eth
 * @notice this is a single token pair reserves DEX, ref: "Scaffold-ETH Challenge 4" as per https://speedrunethereum.com/, README.md and full branch (front-end) made with lots of inspiration from pre-existing example repos in scaffold-eth organization.
 */
contract DexBonus {
  /* ========== GLOBAL VARIABLES ========== */

  uint256 public totalLiquidity; //total amount of liquidity provider tokens (LPTs) minted (NOTE: that LPT "price" is tied to the ratio, and thus price of the assets within this AMM)
  mapping(address => uint256) public liquidity; //liquidity of each depositor
  IERC20 public token; //instantiates the imported contract

  /* ========== EVENTS ========== */

  /**
   * @notice Emitted when ethToToken() swap transacted
   */
  event EthToTokenSwap(address swapper, string txDetails, uint256 ethInput, uint256 tokenOutput);

  /**
   * @notice Emitted when tokenToEth() swap transacted
   */
  event TokenToEthSwap(address swapper, string txDetails, uint256 tokensInput, uint256 ethOutput);

  /**
   * @notice Emitted when liquidity provided to DEX and mints LPTs.
   */
  event LiquidityProvided(
    address liquidityProvider,
    uint256 tokensInput,
    uint256 ethInput,
    uint256 liquidityMinted
  );

  /**
   * @notice Emitted when liquidity removed from DEX and decreases LPT count within DEX.
   */
  event LiquidityRemoved(
    address liquidityRemover,
    uint256 tokensOutput,
    uint256 ethOutput,
    uint256 liquidityWithdrawn
  );

  /* ========== CONSTRUCTOR ========== */

  /**
   *
   * @param _tokenAddr address of erc20
   * @param _gateway address of axelar gateway
   * @param _gasService address of axelar gasService
   */
  constructor(address _tokenAddr, address _gateway, address _gasService) {
    token = IERC20(_tokenAddr); //specifies the token address that will hook into the interface and be used through the variable 'token'
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice init tokens  transferred to  DEX. Loads contract up with both ETH and ERC20.
   * @param tokens amount to be transferred to DEX
   * @return totalLiquidity number of LP tokens minted when deposits made to DEX
   * NOTE:  ratio is 1:1, this is fine to initialize the totalLiquidity (wrt to erc20 token) as equal to eth balance of contract.
   */
  function init(uint256 tokens) public payable returns (uint256) {
    require(totalLiquidity == 0, 'DEX: init - already has liquidity');
    //total lp tokens available initially
    totalLiquidity = address(this).balance;
    liquidity[msg.sender] = totalLiquidity;
    require(
      token.transferFrom(msg.sender, address(this), tokens),
      'DEX: init - transfer did not transact'
    );
    return totalLiquidity;
  }

  /**
   * @notice returns yOutput, or yDelta for xInput (or xDelta)
   */
  function price(
    uint256 xInput,
    uint256 xReserves,
    uint256 yReserves
  ) public view returns (uint256 yOutput) {
    uint256 xInputWithFee = xInput * 997;
    uint256 numerator = xInputWithFee * yReserves;
    uint256 denominator = (xReserves * 1000) + xInputWithFee;
    return (numerator / denominator);
  }

  /**
   * @notice returns liquidity for a user. Note this is notneeded typically due to the `liquidity()` mapping variable being public and having a getter as a result. This is left though as it is used within the front end code (App.jsx).
   */
  function getLiquidity(address lp) public view returns (uint256) {
    return liquidity[lp];
  }

  /**
   * @notice sends Ether to DEX in exchange for $BAL
   */
  function ethToToken() public payable returns (uint256 tokenOutput) {
    require(msg.value > 0, 'cannot swap 0 ETH');
    uint256 ethReserve = address(this).balance - msg.value;
    uint256 token_reserve = token.balanceOf(address(this));
    tokenOutput = price(msg.value, ethReserve, token_reserve);

    require(token.transfer(msg.sender, tokenOutput), 'ethToToken(): reverted swap.');
    emit EthToTokenSwap(msg.sender, 'Eth to ERC20 token', msg.value, tokenOutput);
    return tokenOutput;
  }

  /**
   * @notice sends $BAL tokens to DEX in exchange for Ether
   */
  function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
    require(tokenInput > 0, 'cannot swap 0 tokens');
    uint256 token_reserve = token.balanceOf(address(this));
    ethOutput = price(tokenInput, token_reserve, address(this).balance);
    require(
      token.transferFrom(msg.sender, address(this), tokenInput),
      'tokenToEth(): reverted swap.'
    );
    (bool sent, ) = msg.sender.call{value: ethOutput}('');
    require(sent, 'tokenToEth: revert in transferring eth to you!');
    emit TokenToEthSwap(msg.sender, 'ERC20 to ETH', ethOutput, tokenInput);
    return ethOutput;
  }

  /**
   * @notice allows deposits of $BAL and $ETH to liquidity pool
   * NOTE: parameter is the msg.value sent with this function call. That amount is used to determine the amount of $BAL needed as well and taken from the depositor.
   * NOTE: user has to make sure to give DEX approval to spend their tokens on their behalf by calling approve function prior to this function call.
   * NOTE: Equal parts of both assets will be removed from the user's wallet with respect to the price outlined by the AMM.
   */
  function deposit() public payable returns (uint256 tokensDeposited) {
    require(msg.value > 0, 'Must send value when depositing');
    uint256 ethReserve = address(this).balance - msg.value;
    uint256 tokenReserve = token.balanceOf(address(this));
    uint256 tokenDeposit;

    tokenDeposit = ((msg.value * tokenReserve) / ethReserve) + 1;

    //LP tokens
    uint256 liquidityMinted = (msg.value * totalLiquidity) / ethReserve;

    //Mark LP tokens for sender
    liquidity[msg.sender] += liquidityMinted;
    totalLiquidity += liquidityMinted;

    //transfer in erc20s
    require(token.transferFrom(msg.sender, address(this), tokenDeposit));
    emit LiquidityProvided(msg.sender, liquidityMinted, msg.value, tokenDeposit);
    return tokenDeposit;
  }

  /**
   * @notice allows withdrawal of $BAL and $ETH from liquidity pool
   * NOTE: with this current code, the msg caller could end up getting very little back if the liquidity is super low in the pool. I guess they could see that with the UI.
   */
  function withdraw(uint256 amount) public returns (uint256 eth_amount, uint256 token_amount) {
    require(
      liquidity[msg.sender] >= amount,
      'withdraw: sender does not have enough liquidity to withdraw.'
    );
    uint256 ethReserve = address(this).balance;
    uint256 tokenReserve = token.balanceOf(address(this));
    uint256 ethWithdrawn;

    ethWithdrawn = (amount * ethReserve) / totalLiquidity;

    uint256 tokenAmount = (amount * tokenReserve) / totalLiquidity;
    liquidity[msg.sender] -= amount;
    totalLiquidity -= amount;
    (bool sent, ) = payable(msg.sender).call{value: ethWithdrawn}('');
    require(sent, 'withdraw(): revert in transferring eth to you!');
    require(token.transfer(msg.sender, tokenAmount));
    emit LiquidityRemoved(msg.sender, amount, ethWithdrawn, tokenAmount);
    return (ethWithdrawn, tokenAmount);
  }

  /**
   * @notice trigger token swap on dest chain
   * @param _destChain name of dest chain
   * @param _destContractAddr address on destination chain
   * @param _symbol token symbol
   * @param _amount amount of token to swap
   */
  function interchainSwap(
    string memory _destChain,
    string memory _destContractAddr,
    string memory _symbol,
    uint256 _amount
  ) external payable {
    // TODO Implement
  }

  /**
   * @notice execute message on dest chain
   * @param payload in coming gmp msg
   * @param
   * @param amount amount of tokens being sent
   */
  function _executeWithToken(
    string calldata,
    string calldata,
    bytes calldata payload,
    string calldata,
    uint256 amount
  ) internal /*override*/ {
    // TODO Implement
  }
}
