const ChainUtil = require("../chain-util");
const { TRANSACTION_FEE } = require("../config");
const { MINIMUM_ROYALTY } = require("../config");
const Blockchain = require("../blockchain/blockchain");
const Contract = require("./contract");

//Different transactions allowed
const TRANSACTION_TYPE = {
  transaction: "TRANSACTION",
  stake: "STAKE",
  validator_fee: "VALIDATOR_FEE",
  song: "SONG",
  contract: "CONTRACT",
  royalty: "ROYALTY"
};

class Transaction {
  constructor() {
    this.id = ChainUtil.id();
    this.type = null;
    this.input = null;
    this.output = null;
  }

  static newTransaction(blockchain, senderWallet, to, amount, type, soundHash, prodShare, userShare, paymentMethod, prevID) {
    if (amount > senderWallet.balance || amount < TRANSACTION_FEE) {
      console.log(`Amount : ${amount} exceeds the balance or it is lower tha transaction fee`);
      return;
    }

    return Transaction.generateTransaction(blockchain, senderWallet, to, amount, type, soundHash, prodShare, userShare, paymentMethod, prevID);
  }

  //Set all the values used to build a proper transaction
  static generateTransaction(blockchain, senderWallet, to, amount, type, soundHash, prodShare, userShare, paymentMethod, prevID) {
    const transaction = new this();
    transaction.type = type; 

    //These values are shown in the transaction output
    transaction.output = {
      to: to,
      amount: amount - TRANSACTION_FEE,
      fee: TRANSACTION_FEE,
      soundHash: soundHash,
      prodShare: prodShare,
      userShare: userShare,
      paymentMethod : paymentMethod,
      prevID: prevID
    };

    if (type == "SONG"){
      transaction.output["accumulatedShare"] = Transaction.calculateAccumulatedShare(prevID, userShare, blockchain);
    }

    Transaction.signTransaction(transaction, senderWallet);
    return transaction;
  }

  static signTransaction(transaction, senderWallet) {
    transaction.input = {
      timestamp: Date.now(),
      from: senderWallet.publicKey,
      signature: senderWallet.sign(ChainUtil.hash(transaction.output))
    };
  }

  static verifyTransaction(transaction) {
    if (transaction == undefined) {
      return false;
    }
    if (transaction.input == undefined) {
      return false;
    }
    return ChainUtil.verifySignature(
      transaction.input.from,
      transaction.input.signature,
      ChainUtil.hash(transaction.output)
    );
  }

  //Series of checks to verify the consistency of every single transaction, depending on the transaction type
  static transactionContentVerify(transaction, blockchain) {
    if (!Transaction.verifyTransaction(transaction)) {
      console.log("Signature is not valid");
      return false;
    }

    let amount = transaction.output.amount;
    if (amount == undefined) {
      amount = 0;
    }

    if (blockchain.getBalance(transaction.input.from) < amount + TRANSACTION_FEE) {
      console.log("Not enough balance");
      return false;
    }

    if (transaction.amount < 0) {
      console.log("Amount lower than the transaction fee");
      return false;
    }

    switch (transaction.type) {
      case TRANSACTION_TYPE.transaction:
        if (transaction.output.to == undefined || transaction.output.to === "") {
          console.log("Destination address is undefined");
          return false;
        }
        break;

      case TRANSACTION_TYPE.validator_fee:
        if (transaction.output.to != 0) {
          console.log("Invalid address inserted. Please send the amount to address 0");
          return false;
        }
        if (amount != 30) {
          console.log("Invalid amount inserted. Please send an amount equal to 31");
          return false;
        }
        break;

      case TRANSACTION_TYPE.song:
        if (transaction.output.soundHash == undefined || transaction.output.soundHash === "") {
          console.log("Sound hash undefined");
          return false;
        }
        else if (transaction.output.userShare == undefined || transaction.output.userShare === "") {
          console.log("User share undefined");
          return false;
        }
        else if (transaction.output.prevID == undefined || transaction.output.prevID === "") {
          console.log("Previous ID undefined");
          return false;
        }

        if (transaction.output.prevID == 0 && transaction.output.userShare >= 1 || transaction.output.userShare < 0) {
          console.log("User share not valid");
          return false;
        }
        
        let accumulatedShare = undefined;
        if (transaction.output.prevID != 0) {
          blockchain.chain.forEach(block => {
            block.data.forEach(trans => {
              if (transaction.output.prevID == trans.id) {
                accumulatedShare = trans.output.accumulatedShare;
              }
            });
          });
          if(accumulatedShare == undefined) {
            console.log("Previous ID doesn't exist");
            return false;
          }
        }
        if (Number(accumulatedShare) + Number(transaction.output.userShare) >= 1) {
          console.log("User share too high");
          return false;
        }
        break;

      case TRANSACTION_TYPE.stake:
        return true;

      case TRANSACTION_TYPE.contract:
        if (transaction.output.paymentMethod != "variousPayment") {
          console.log("Invalid payment method");
          return false;
        }

        if (!Array.isArray(transaction.output.transactionIDs)) {
          console.log("Transaction IDs are not valid");
          return false;
        }

        //Check the validity of the shaer inserted
        let userShareList = Object.values(transaction.output.userShares);
        let totalShare = 0;
        userShareList.forEach(element => {
          totalShare += element;
        });
        if (totalShare >= 1) {
          console.log("Users total share exceeds");
          return false;
        }

        //Check the validity of the sum of the shares for connected sounds
        let transactionShareList = Object.values(transaction.output.transactionAccumulatedShares);
        totalShare = 0;
        transactionShareList.forEach(element => {
          totalShare += element;
        });
        if (totalShare >= 1) {
          console.log("Transactions total share exceeds");
          return false;
        }

        //Check the validity of the previous sound to which I want to connect mine
        let transactionsExist = true;
        transaction.output.transactionIDs.forEach(transactionID => {
          let itExists = false;
          blockchain.chain.forEach(block => {
            block.data.forEach(transaction => {
              if (transaction.id == transactionID) {
                itExists = true;
              }
            });
          });
          if(!itExists) {
            transactionsExist = false;
          }
        });
        if (!transactionsExist) {
          console.log("Transaction IDs are not consistent");
          return false;
        }

        //Check the consistency of the value calculated by the accumulated share method
        const ordered1 = {};
        Object.keys(transaction.output.transactionAccumulatedShares).sort().forEach(function(key) {
          ordered1[key] = transaction.output.transactionAccumulatedShares[key];
        });
        const ordered2 = {};
        Object.keys(Contract.transactionAccumulatedSharesCalculator(blockchain, transaction.output.transactionIDs)).sort().forEach(function(key) {
          ordered2[key] = Contract.transactionAccumulatedSharesCalculator(blockchain, transaction.output.transactionIDs)[key];
        });
        if (JSON.stringify(ordered1) != JSON.stringify(ordered2)) {
          console.log("Transaction accumulated shares are not consistent");
          return false;
        }

        //Check the consistency of the valus of the user shares inserted by the users
        const ordered3 = {};
        Object.keys(transaction.output.userShares).sort().forEach(function(key) {
          ordered3[key] = transaction.output.userShares[key];
        });
        const ordered4 = {};
        Object.keys(Contract.userSharesCalculator(blockchain, transaction.output.transactionIDs)).sort().forEach(function(key) {
          ordered4[key] = Contract.userSharesCalculator(blockchain, transaction.output.transactionIDs)[key];
        });
        if (JSON.stringify(ordered3) != JSON.stringify(ordered4)) {
          console.log("User shares shares are not consistent");
          return false;
        }
        break;

      case TRANSACTION_TYPE.royalty:
        if (transaction.output.to == undefined || transaction.output.to === "") {
          console.log("Destination contract ID is undefined");
          return false;
        }

        //A minimum royalty is defined for each contract
        if (transaction.output.amount < MINIMUM_ROYALTY) {
          console.log("The amount is lower than the minimum royalty");
          return false;
        }

        let destinationExists = false;
        blockchain.chain.forEach(block => {
          block.data.forEach(trans => {
            if (transaction.output.to == trans.id) {
              destinationExists = true;
            }
          });
        });
        if (!destinationExists) {
          console.log("Wrong destination contract ID");
          return false;
        }
        break;
    
      default:
        console.log("Transaction type not recognized");
        return false;
    }
    return true; 
  }

  //It calculates accumulated share for sounds connected
  static calculateAccumulatedShare(prevID, userShare, blockchain) {
    let accumulatedShare = 0;
    if (prevID == 0) {
      return userShare;
    } else {
      blockchain.chain.forEach(block => {
        block.data.forEach(transaction => {
            if (transaction.id == prevID) {
                accumulatedShare = parseFloat((Number(transaction.output.accumulatedShare) + Number(userShare)).toFixed(3));
            }
        });
      });
    }
    return accumulatedShare;
  }
}

module.exports = Transaction;