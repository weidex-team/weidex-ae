const Crypto = require('@aeternity/aepp-sdk').Crypto;

module.exports = {
    getAddress,
    arraysEqual,
};

function getAddress(publicKey) {
    let address = '0x' + Crypto.decodeBase58Check(publicKey.split('_')[1]).toString('hex');
    return address;
}

function arraysEqual(a, b) {
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
            return false;
        }
    }
    return true;
}
