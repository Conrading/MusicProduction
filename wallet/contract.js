const ChainUtil = require("../chain-util");
const { TRANSACTION_FEE } = require("../config");

class Contract {

    constructor() {
        this.id = ChainUtil.id();
        this.type = "CONTRACT";
        this.input = null;
        this.output = null;
    }

    //Set all the values used to build a proper contract
    static newContract(blockchain, senderWallet, paymentMethod, transactionIDs, songHash, prodShare) {
        let transactionAccumulatedShares = Contract.transactionAccumulatedSharesCalculator(blockchain, transactionIDs);
        let userShares = Contract.userSharesCalculator(blockchain, transactionIDs);
        let userSharesList = Object.values(userShares);
        let totalShare = 0;
        userSharesList.forEach(element => {
            totalShare += element;
        });
        const contract = new this();

        //These values are shown in the contract output
        contract.output = {
            fee: TRANSACTION_FEE,
            songHash: songHash,
            prodShare: Contract.calculateProdShare(paymentMethod, totalShare, prodShare),
            transactionIDs : transactionIDs,
            userShares : userShares,
            paymentMethod : paymentMethod,
            transactionAccumulatedShares : transactionAccumulatedShares
        };

        Contract.signContract(contract, senderWallet);
        console.log("userShares: %o\ntotalShare: %o", userShares, totalShare);
        return contract;
    }

    //Return the list of the users who took part to the contract together with the share they set
    static userSharesCalculator (blockchain, transactionIDs) {
        let userShares = {};
        if (!Array.isArray(transactionIDs)) {
            return userShares;
        }
        do {
            let listPrevIDs = [];
            transactionIDs.forEach(transactionID => {
                blockchain.chain.forEach(block => {
                    block.data.forEach(transaction => {
                        if (transaction.id == transactionID) {
                            if (transaction.output.prevID != 0) {
                                listPrevIDs.push(transaction.output.prevID);
                            }
                            if (userShares[transaction.input.from] == undefined) {
                                userShares[transaction.input.from] = 0;                               
                            }
                            userShares[transaction.input.from] = parseFloat((userShares[transaction.input.from] + Number(transaction.output.userShare)).toFixed(3));
                        }
                    });
                });
            });
            transactionIDs = listPrevIDs;
        } while (transactionIDs.length > 0);
        return userShares;
    }

    //Other types of payment methods could be implemented...
    static calculateProdShare(paymentMethod, totalShare, prodShare) {
        switch (paymentMethod) {
            case "variousPayment":
                prodShare = 1 - totalShare;
                break;
        }
        return prodShare;
    }

    static signContract(contract, senderWallet) {
        contract.input = {
          timestamp: Date.now(),
          from: senderWallet.publicKey,
          signature: senderWallet.sign(ChainUtil.hash(contract.output))
        };
    }

    //When different sounds are connected in the blockchain, the different shares are summed up 
    static transactionAccumulatedSharesCalculator(blockchain, transactionIDs) {
        let transactionAccumulatedShares = {};
        if (!Array.isArray(transactionIDs)) {
            return transactionAccumulatedShares;
        }
        transactionIDs.forEach(transactionID => {
            blockchain.chain.forEach(block => {
                block.data.forEach(transaction => {
                    if (transaction.id == transactionID) {
                        transactionAccumulatedShares[transaction.id] = Number(transaction.output.accumulatedShare);
                    }
                });
            });
        });
        return transactionAccumulatedShares;
    }
}

module.exports = Contract;