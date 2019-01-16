const Crypto = require('@aeternity/aepp-sdk').Crypto;

function getAddress(publicKey) {
    let address = '0x' + Crypto.decodeBase58Check(publicKey.split('_')[1]).toString('hex');
    return address;
}

module.exports = {
    getAddress,
};
