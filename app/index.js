const express = require("express");
const Blockchain = require("../blockchain/blockchain");
const Stake = require("../blockchain/stake");
const bodyParser = require("body-parser");
const P2pserver = require("../app/p2p-server");
const Wallet = require("../wallet/wallet");
const TransactionPool = require("../wallet/transaction-pool");
const { TRANSACTION_THRESHOLD } = require("../config");
const Block = require("../blockchain/block");
//const Hash = require('ipfs-only-hash')
var SHA256 = require("crypto-js/sha256");

////////////// ipfs ///////////////////

//const ipfsClient = require('ipfs-http-client');
const fileUpload = require('express-fileupload');
const fs = require('fs');

//const ipfs = new ipfsClient({ host: 'localhost', port: '5001', protocol:'http'});

/////////////// end ipfs //////////////

const HTTP_PORT = process.env.HTTP_PORT || 3001;

const app = express();

app.use(bodyParser.json());

const blockchain = new Blockchain();
const stake = new Stake();
const wallet = new Wallet(Date.now().toString());
const transactionPool = new TransactionPool();
const p2pserver = new P2pserver(blockchain, transactionPool, wallet);

///////////////// ipfs ///////////////////////
/*
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(fileUpload());
app.use(express.static(__dirname+'/public'));

app.get('/', (req, res) => {
  let pub_key = wallet.publicKey;
  let balance = blockchain.getBalance(pub_key);
  res.render('home', {pub_key, balance});
});

app.get('/home', (req, res) => {
  let pub_key = wallet.publicKey;
  let balance = blockchain.getBalance(pub_key);
  res.render('home', {pub_key, balance});
});

app.get('/Transaction', (req, res) => {
  res.render('Transaction');
});

app.get('/ValidatorFee', (req, res) => {
  res.render('ValidatorFee');
});

app.get('/Stake', (req, res) => {
  res.render('Stake');
});

app.get('/Song', (req, res) => {
  res.render('Song');
});

app.get('/Royalty', (req, res) => {
  res.render('Royalty');
});

app.get('/Contract', (req, res) => {
  res.render('Contract');
});

app.post('/upload', (req,res) => {
  const file = req.files.file;
  const fileName = req.body.fileName;
  const filePath = 'files/' + fileName;
  const userShare = req.body.usershare;
  const previousID = req.body.previousID;
  const type = "SONG";
  let to, amount, prodShare, paymentMethod;
  //let fileHash;

  file.mv(filePath, async (err) => {

    //fileHash = await Hash.of(filePath);

    let leader = blockchain.getLeader();
    const transaction = wallet.createTransaction( to, amount, type, blockchain, transactionPool, prodShare, userShare, paymentMethod, previousID); //ill fileHash

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

    if (transaction != false) {
      file.mv(filePath, async (err) => {
          if (err) {
              console.log('Error: failed to download the file');
              return res.status(500).send(err);
          }
  
          //fileHash = await addFile(fileName, filePath);
          //fs.unlink(filePath, (err) => {
              //if (err) console.log(err);
          //);
  
          //res.render('upload', { fileName, userShare, previousID}); //kill fileHash 
      });
    }else{
      res.render('song_not_uploaded', { fileName, userShare, previousID}); //kill fileHash
    }

  });

});

app.post('/upload_contract', (req,res) => {
  const file = req.files.file;
  const fileName = req.body.fileName;
  const filePath = 'files/' + fileName;
  let prodShare = req.body.prodShare;
  let transactionIDs = req.body.transactionIDs;
  transactionIDs = transactionIDs.split(",");
  transactionIDs = JSON.parse(transactionIDs);
  const paymentMethod = req.body.paymentMethod;
  //let songHash;

  file.mv(filePath, async (err) => {

    //songHash = await Hash.of(filePath);

    let leader = blockchain.getLeader();
    const contract = wallet.createContract(blockchain, transactionPool, paymentMethod, transactionIDs, prodShare); //kill songHash
    let userShares;
    if(contract != false) {
      userShares = JSON.stringify(contract.output.userShares, null, 4);
      prodShare = contract.output.prodShare;
      transactionIDs = JSON.stringify(transactionIDs, null, 4);
    }

    p2pserver.broadcastTransaction(contract);

    if (transactionPool.transactions.length >= TRANSACTION_THRESHOLD) {

      if (leader == wallet.getPublicKey()) {
        console.log("Creating block");
        let block = blockchain.createBlock(transactionPool.transactions, wallet);
        p2pserver.broadcastBlock(block);
      }
    }

    if (contract != false) {
      file.mv(filePath, async (err) => {
          if (err) {
              console.log('Error: failed to download the file');
              return res.status(500).send(err);
          }
  
          //songHash = await addFile(fileName, filePath);
          //fs.unlink(filePath, (err) => {
              //if (err) console.log(err);
          //});
  
          res.render('upload_contract', { userShares, transactionIDs, prodShare});// kill songHash
      });
    }else{
      res.render('contract_not_uploaded', { userShares, transactionIDs, prodShare});// kill songHash
    }

  });

});

  //const addFile = async (fileName, filePath) => {
  //const file = fs.readFileSync(filePath);
  //const fileAdded = await ipfs.add({path: fileName, content: file});
  //const fileHash = fileAdded[0].hash;

  //return fileHash;
//}

app.post("/transact_gui", (req, res) => {
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
    res.render("transaction_executed");
  }else{
    res.render("transaction_failed");
  }
});

*/
////////////////// ipfs end /////////////////////////
/*
//Series of get and post used mostly for debugging via postman
app.get("/transactions", (req, res) => {
  res.json(transactionPool.transactions);
});

app.get("/blocks", (req, res) => {
  res.json(blockchain.chain);
});

app.post("/transact", (req, res) => {
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

  res.redirect("/transactions");
});

app.post("/contract", (req, res) => {
  let leader = blockchain.getLeader();
  const { paymentMethod, transactionIDs, prodShare } = req.body; //kill songHash
  const contract = wallet.createContract(blockchain, transactionPool, paymentMethod, transactionIDs, prodShare); //kill songHash

  p2pserver.broadcastTransaction(contract);

  if (transactionPool.transactions.length >= TRANSACTION_THRESHOLD) {

    if (leader == wallet.getPublicKey()) {
      console.log("Creating block");
      let block = blockchain.createBlock(transactionPool.transactions, wallet);
      p2pserver.broadcastBlock(block);
    }
  }
  res.redirect("/transactions");
});
*/
app.get("/public-key", (req, res) => {
  res.json({ publicKey: wallet.publicKey });
});

app.get("/balance", (req, res) => {
  res.json({ balance: blockchain.getBalance(wallet.publicKey) });
});

app.get("/leader", (req, res) => {
  res.json({ leader: blockchain.getLeader() });
});

app.post("/balance-of", (req, res) => {
  res.json({ balance: blockchain.getBalance(req.body.publicKey) });
});

app.get("/last-hash", (req, res) => {
  lastHash = stake.lastHash(blockchain.getLastHash());
  res.json({ lastHash: lastHash });
});

app.get("/hash", (req, res) => {
  let block = blockchain.chain[chain.length -1];
  let hash = Block.hash(block.timestamp, block.lastHash, block.data);
  res.json({ hash: hash });
});

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});

p2pserver.listen();
