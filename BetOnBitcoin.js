const { expect } = require("chai")
const { ethers } = require("hardhat")
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")
const { time, loadFixture, } = require("@nomicfoundation/hardhat-network-helpers")

describe("Tellor", function() {
  let betOnBitcoin
  let tellor
  let addr1, addr2
  const abiCoder = new ethers.utils.AbiCoder()

  //generate queryData and queryId for btc/usd price
  const BTC_USD_QUERY_DATA_ARGS = abiCoder.encode(["string", "string"], ["btc", "usd"])
  const BTC_USD_QUERY_DATA = abiCoder.encode(["string", "bytes"], ["SpotPrice", BTC_USD_QUERY_DATA_ARGS])
  const BTC_USD_QUERY_ID = ethers.utils.keccak256(BTC_USD_QUERY_DATA)

  beforeEach(async function() {
    // create fake addresses for short and long bettors
    [addr1, addr2] = await ethers.getSigners()
    // set up tellor playground oracle 
    let TellorPlayground = await ethers.getContractFactory(abi, bytecode)
    tellor = await TellorPlayground.deploy()
    await tellor.deployed()
    // set up BetOnBitcoin 
    let BetOnBitcoin = await ethers.getContractFactory("BetOnBitcoin")
    betOnBitcoin = await BetOnBitcoin.deploy(tellor.address)
    await betOnBitcoin.deployed()
  })

  it("should allow someone to bet that btc price will drop after 24 hrs", async function () {
    // set addr1 as short bettor and bet 1 eth
    await betOnBitcoin.connect(addr1).enterShort({value: ethers.utils.parseEther("1")})
    shortAddressAfter = await betOnBitcoin.shortBettor()
    // check that the address is being assigned correctly
    expect(shortAddressAfter).to.equal(addr1.address)
    // check that betAmount is being tracked correctly
    let betAmount = await betOnBitcoin.betAmount()
    expect(betAmount).to.equal(ethers.utils.parseEther("1"))
    // check that the bet has been placed
    expect(await betOnBitcoin.isShortPlaced()).to.be.true
  })

  it("should allow someone to bet that btc price will go up after 24 hrs", async function () {
    // set addr2 as long bettor and bet 1 ether
    await betOnBitcoin.connect(addr2).enterLong({value: ethers.utils.parseEther("1")})
    // check that address is being assigned correctly
    longAddressAfter = await betOnBitcoin.longBettor()
    expect(longAddressAfter).to.equal(addr2.address)
    //check that betAmount is being tracked correctly
    let betAmount = await betOnBitcoin.betAmount()
    expect(betAmount).to.equal(ethers.utils.parseEther("1"))
    // check that the bet has been placed
    expect(await betOnBitcoin.isLongPlaced()).to.be.true

  })

  it("should lock bets in the contract for 24 hrs after both sides have bet", async function () {
    // have short and long bet 1 eth
    await betOnBitcoin.connect(addr2).enterLong({value: ethers.utils.parseEther("1")})
    await betOnBitcoin.connect(addr1).enterShort({value: ethers.utils.parseEther("1")})
    // submit inital mock price
    let value = BigInt(20000e18)
    let valueBytes = abiCoder.encode(["uint256"], [value]);
    await tellor.submitValue(BTC_USD_QUERY_ID, valueBytes, 0, BTC_USD_QUERY_DATA)
    // fast forward 15 min
    await ethers.provider.send("evm_increaseTime", [9000])
    await ethers.provider.send("evm_mine")
    // execute lockBet
    await betOnBitcoin.lockBet()
    // check submitted price in contract
    let retreivedPrice = await betOnBitcoin.btcPriceBefore()
    console.log(await betOnBitcoin.getNewValueCountbyQueryId(BTC_USD_QUERY_ID))
    console.log(await betOnBitcoin.getDataBefore(BTC_USD_QUERY_ID, 9999999999))
    expect(BigInt(retreivedPrice)).to.equal(value)
    

    // get contract balance - check before as well
    // check that person that sent money lost money
  })

  it("should use tellor to pay out the winner 24 hrs after bet was locked", async function () {
    await betOnBitcoin.connect(addr2).enterLong({value: ethers.utils.parseEther("1")})
    await betOnBitcoin.connect(addr1).enterShort({value: ethers.utils.parseEther("1")})
    await betOnBitcoin.lockBet()
    // submit mock price
    // run enter short and enter long 
    let value = BigInt(25000e18)
    let valueBytes = abiCoder.encode(["uint256"], [value]);
    await tellor.submitValue(BTC_USD_QUERY_ID, valueBytes, 0, BTC_USD_QUERY_DATA)
    // fast forward over 1 day
    await ethers.provider.send("evm_increaseTime", [900000])
    await ethers.provider.send("evm_mine")
    // execute lockBet
    // execute resolveBet
    await betOnBitcoin.resolveBet()
    /*expect addr2 to have 2 eth now*/
    // read retreived value from contract
    //const retrievedAfterPrice = await betOnBitcoin.btcPriceAfter()

    // get contract balance 
    //const provider = ethers.getDefaultProvider()
    //const balance = await provider.getBalance(contract.address)

    //expect(BigInt(retrievedAfterPrice)).to.equal(mockValue2)
    //expect(balance).to.equal('0')
    
  })

})




