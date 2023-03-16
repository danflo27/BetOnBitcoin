// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "usingtellor/contracts/UsingTellor.sol";

contract BetOnBitcoin is UsingTellor {

    address payable public shortBettor;
    address payable public longBettor;
    uint public betAmount;
    uint public timePlaced;
    uint public btcPriceBefore;
    uint public btcPriceAfter;
    uint public unlockTime;
    uint public initialPriceTime;
    bool public isShortPlaced;
    bool public isLongPlaced;
    // ? why bytes 
    bytes public queryData = abi.encode("SpotPrice", abi.encode ("btc", "usd"));
    bytes32 public queryId = keccak256(queryData);

    constructor(address payable _tellorAddress) UsingTellor(_tellorAddress) {}

    //place bet that price will decrease
    function enterShort() public payable {
        //require(isShortPlaced == false, "short bet has already been placed");
        shortBettor = payable(msg.sender);

        //place new bet or match long bet 
        if (betAmount == 0) {
            betAmount = msg.value;
        }
        else {
            require(msg.value == betAmount, "the bet amount was not matched");
        }
        isShortPlaced = true;
    }

    //place bet that price will increase
    function enterLong() payable public {
        //require(isLongPlaced == false, "long bet has already been placed");
        longBettor = payable(msg.sender);

        //place new bet or match short bet
        if (betAmount == 0) {
            betAmount = msg.value;
        } else {
            require(msg.value == betAmount, "the bet amount was not matched");
        }
        isLongPlaced = true;
    }

    //retrieve most recent btc price and lock bet for 24 hrs
    function lockBet() public {
        require (isLongPlaced == true, "long bet hasn't been placed yet");
        require (isShortPlaced == true, "short bet has't been placed yet");
        timePlaced = block.timestamp;
        unlockTime = timePlaced + 24 hours;
        betAmount = betAmount * 2;

        // get btc price
        (bytes memory _value, uint256 _timestampRetrieved) =
            getDataBefore(queryId, block.timestamp - 15 minutes);
        // check if data exists 
        if (_timestampRetrieved > 0) {
            if (block.timestamp - _timestampRetrieved < 24 hours) {
                btcPriceBefore = _sliceUint(_value); 
                initialPriceTime = _timestampRetrieved; 
            }
        }
    }

    //retrieve new btc price and pay winner
    function resolveBet() public payable {
        require(block.timestamp >= unlockTime, "not enough time has passed since bets were placed");

        //get new btc price
        (bytes memory _value, uint256 _timestampRetrieved) = 
        getDataBefore(queryId, block.timestamp - 15 minutes);
        if (_timestampRetrieved > 0) {
            if (block.timestamp - _timestampRetrieved < 24 hours) {
                // check that new data is being used
                if (initialPriceTime < _timestampRetrieved) {
                    btcPriceAfter = _sliceUint(_value);
                }
            }
        }

        //pay winner
        if (btcPriceAfter >= btcPriceBefore) {
            longBettor.transfer(betAmount); 
        } else {
            shortBettor.transfer(betAmount);
        }
    }





}