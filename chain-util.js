const EDDSA = require("elliptic").eddsa;
const eddsa = new EDDSA("ed25519");

const uuidV1 = require("uuid/v1");

const SHA256 = require("crypto-js/sha256");

class ChainUtil {
  static genKeyPair(secret) {
    return eddsa.keyFromSecret(secret);
  }

  static id() {
    return uuidV1();
  }

  static hash(data) {
    return SHA256(JSON.stringify(data)).toString();
  }

  static verifySignature(publicKey, signature, dataHash) {
    var verified;
    try {
      verified = eddsa.keyFromPublic(publicKey).verify(dataHash, signature);
    } catch (error) {
      console.log("error: %o", error);
      verified = false;
    }
    return verified;
  }
}

module.exports = ChainUtil;
