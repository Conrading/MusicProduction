const express = require("express");
const Blockchain = require("../blockchain/blockchain");
const Stake = require("../blockchain/stake");
const bodyParser = require("body-parser");
const P2pserver = require("../app/p2p-server");
const Wallet = require("../wallet/wallet");
const TransactionPool = require("../wallet/transaction-pool");
const { TRANSACTION_THRESHOLD } = require("../config");
const Block = require("../blockchain/block");

const HTTP_PORT = 3000;

const app = express();

app.use(bodyParser.json());

const blockchain = new Blockchain();
const stake = new Stake();
const wallet = new Wallet("i am the first leader");
const transactionPool = new TransactionPool();
const p2pserver = new P2pserver(blockchain, transactionPool, wallet);

//Get and post to check and change the status of the blockchain
//All executed by the ICO
app.get("/ico/transactions", (req, res) => {
  res.json(transactionPool.transactions);
});

app.get("/ico/blocks", (req, res) => {
  res.json(blockchain.chain);
});

app.post("/ico/transact", (req, res) => {
  let leader = blockchain.getLeader();
  const { to, amount, type, soundHash, prodShare, userShare, paymentMethod, prevID } = req.body;
  const transaction = wallet.createTransaction( to, amount, type, blockchain, transactionPool, soundHash, prodShare, userShare, paymentMethod, prevID);

  if (transaction != false) {
    p2pserver.broadcastTransaction(transaction);

    if (transactionPool.transactions.length >= TRANSACTION_THRESHOLD) {
  
      if (leader == wallet.getPublicKey()) {
        console.log("Creating block");
        let block = blockchain.createBlock(transactionPool.transactions, wallet);
        p2pserver.broadcastBlock(block);
      }
    }
  }

  res.redirect("/ico/transactions");
});

app.post("/ico/contract", (req, res) => {
  let leader = blockchain.getLeader();
  const { paymentMethod, transactionIDs, songHash, prodShare } = req.body;
  const contract = wallet.createContract(blockchain, transactionPool, paymentMethod, transactionIDs, songHash, prodShare);

  if (contract != false) {
    p2pserver.broadcastTransaction(contract);
  
    if (transactionPool.transactions.length >= TRANSACTION_THRESHOLD) {
  
      if (leader == wallet.getPublicKey()) {
        console.log("Creating block");
        let block = blockchain.createBlock(transactionPool.transactions, wallet);
        p2pserver.broadcastBlock(block);
      }
    }
  }

  res.redirect("/ico/transactions");
});

app.get("/ico/public-key", (req, res) => {
  res.json({ publicKey: wallet.publicKey });
});

app.get("/ico/balance", (req, res) => {
  res.json({ balance: blockchain.getBalance(wallet.publicKey) });
});

app.get("/ico/leader", (req, res) => {
  res.json({ leader: blockchain.getLeader() });
});

app.post("/ico/balance-of", (req, res) => {
  res.json({ balance: blockchain.getBalance(req.body.publicKey) });
});

app.get("/ico/last-hash", (req, res) => {
  lastHash = stake.lastHash(blockchain.getLastHash());
  res.json({ lastHash: lastHash });
});

//////  functions to test the broken nodes & chain  ////////
app.post("/ico/broken-chain", (req, res) => {
  p2pserver.broadcastChain(req.body);
  res.redirect("/ico/blocks");
});

app.post("/ico/broken-block", (req, res) => {
  p2pserver.broadcastBlock(req.body);
  res.redirect("/ico/blocks");
});
///////////////////////////////////////////////////////

app.get("/ico/hash", (req, res) => {
  let block = blockchain.chain[chain.length -1];
  let hash = Block.hash(block.timestamp, block.lastHash, block.data);
  res.json({ hash: hash });
});

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});

p2pserver.listen();
