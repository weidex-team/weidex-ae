const Ae = require('@aeternity/aepp-sdk').Universal;
const config = require('./config');
const { getAddress } = require('./utils');

module.exports = {
    getWallets,
};

async function getWallets() {
    const owner = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: pairs[0],
        nativeMode: true,
        networkId: 'ae_devnet',
    });
    owner.pubKey = pairs[0].publicKey;
    owner.addr = getAddress(pairs[0].publicKey);

    const alice = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: pairs[1],
        nativeMode: true,
        networkId: 'ae_devnet',
    });
    alice.pubKey = pairs[1].publicKey;
    alice.addr = getAddress(pairs[1].publicKey);

    const bob = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: pairs[2],
        nativeMode: true,
        networkId: 'ae_devnet',
    });
    bob.pubKey = pairs[2].publicKey;
    bob.addr = getAddress(pairs[2].publicKey);

    return [owner, alice, bob];
}

const pairs = [
    {
        publicKey: 'ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk',
        secretKey:
            '7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d',
    },
    {
        publicKey: 'ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP',
        secretKey:
            '7fa7934d142c8c1c944e1585ec700f671cbc71fb035dc9e54ee4fb880edfe8d974f58feba752ae0426ecbee3a31414d8e6b3335d64ec416f3e574e106c7e5412',
    },
    {
        publicKey: 'ak_FHZrEbRmanKUe9ECPXVNTLLpRP2SeQCLCT6Vnvs9JuVu78J7V',
        secretKey:
            '1509d7d0e113528528b7ce4bf72c3a027bcc98656e46ceafcfa63e56597ec0d8206ff07f99ea517b7a028da8884fb399a2e3f85792fe418966991ba09b192c91',
    },
];
