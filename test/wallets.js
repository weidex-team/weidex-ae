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
        secretKey:
            '7fa7934d142c8c1c944e1585ec700f671cbc71fb035dc9e54ee4fb880edfe8d974f58feba752ae0426ecbee3a31414d8e6b3335d64ec416f3e574e106c7e5412',
        publicKey: 'ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP',
    },
    {
        secretKey:
            'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
        publicKey: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU',
    },
    {
        publicKey: 'ak_tAbWCiPEPeK2SaJ9Biyizsy2JigPuMQ1UUrMQsqCsVcUqMQ9G',
        secretKey:
            '5b6cb45c5e2f099ef9d2b5d418af003498e72fc706e64b62493d69ff96deada6742d67db79880165005ad42a3b1a186f4041266b16a1404e8123ef7e61512dd4',
    },
];
