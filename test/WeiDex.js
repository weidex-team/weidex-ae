const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;

const config = {
    host: 'http://localhost:3001/',
    internalHost: 'http://localhost:3001/internal/',
    weidexSourcePath: './contracts/WeiDex.aes',
    erc20SourcePath: './contracts/mocks/ERC20.aes',
    gas: 200000,
    ttl: 55,
};

let weidex;
let erc20;

describe('WeiDex Contract', () => {
    let owner;
    let alice;
    let bob;

    before(async () => {
        owner = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: wallets[0],
            nativeMode: true,
            networkId: 'ae_devnet',
        });

        alice = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: wallets[1],
            nativeMode: true,
            networkId: 'ae_devnet',
        });

        bob = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: wallets[2],
            nativeMode: true,
            networkId: 'ae_devnet',
        });

        erc20 = await deployContract(owner, config.erc20SourcePath);
        weidex = await deployContract(owner, config.weidexSourcePath);
        await mint(owner, getAddress(wallets[1].publicKey), 10000);
        await mint(owner, getAddress(wallets[2].publicKey), 10000);
    });

    it('should deploy ERC20 contract', async () => {
        assert(erc20.instance, 'could not deploy the ERC20 contract'); // Check it is deployed
    });

    it('should deploy WeiDex contract', async () => {
        assert(weidex.instance, 'could not deploy the WeiDex contract'); // Check it is deployed
    });

    it('should deposit erc20 tokens', async () => {
        const token = getAddress(erc20.instance.address);
        const user = getAddress(wallets[1].publicKey);
        const amount = 100;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert(balanceBefore === 0, 'balance should be 0 at first.');

        const result = await deposit(alice, token, amount, user, user, 0);
        assert(result, 'could not deposit');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(
            balanceAfter === balanceBefore + amount,
            'balance should be increased with the value of deposit'
        );
    });

    it('should deposit ae', async () => {
        const token = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const user = getAddress(wallets[1].publicKey);
        const amount = 100;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert(balanceBefore === 0, 'balance should be 0 at first.');

        const result = await deposit(alice, token, amount, user, user, 100);
        assert(result, 'could not deposit');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(
            balanceAfter === balanceBefore + amount,
            'balance should be increased with the value of deposit'
        );
    });

    it('should withdraw erc20 tokens', async () => {
        const token = getAddress(erc20.instance.address);
        const user = getAddress(wallets[1].publicKey);
        const initialAmount = 100;
        const amount = 50;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert(balanceBefore === initialAmount, 'balance should be initial amount at first');

        const result = await withdraw(alice, token, amount);
        assert(result, 'could not withdraw');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(
            balanceAfter === balanceBefore - amount,
            'balance should be decreased with the value of withdraw'
        );
    });

    it('should withdraw ae', async () => {
        const token = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const user = getAddress(wallets[1].publicKey);
        const initialAmount = 100;
        const amount = 50;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert(balanceBefore === initialAmount, 'balance should be initial amount at first');

        const result = await withdraw(alice, token, amount);
        assert(result, 'could not withdraw');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(
            balanceAfter === balanceBefore - amount,
            'balance should be decreased with the value of withdraw'
        );
    });
});

async function deployContract(owner, path) {
    const source = utils.readFileRelative(path, 'utf-8');
    const compiled = await owner.contractCompile(source, {
        // Compile it
        gas: config.gas,
    });
    const instance = await compiled.deploy({
        // Deploy it
        options: {
            ttl: config.ttl,
        },
        abi: 'sophia',
    });

    return { compiled, instance };
}

async function mint(owner, address, amount) {
    const minted = await owner.contractCall(
        erc20.compiled.bytecode,
        'sophia',
        erc20.instance.address,
        'mint',
        {
            args: `(${address},${amount})`,
            options: {
                ttl: config.ttl,
            },
            abi: 'sophia',
        }
    );

    const result = await minted.decode('bool');
    assert(result.value, 'could not mint.');
    return result.value;
}

function getAddress(publicKey) {
    let address = '0x' + Crypto.decodeBase58Check(publicKey.split('_')[1]).toString('hex');
    return address;
}

async function deposit(user, token, amount, beneficiary, referral, ae) {
    const deposited = await user.contractCall(
        weidex.compiled.bytecode,
        'sophia',
        weidex.instance.address,
        'deposit',
        {
            args: `(${token},${amount},${beneficiary},${referral})`,
            options: {
                ttl: config.ttl,
                amount: ae,
            },
            abi: 'sophia',
        }
    );

    const result = await deposited.decode('bool');
    return result.value;
}

async function withdraw(user, token, amount) {
    const deposited = await user.contractCall(
        weidex.compiled.bytecode,
        'sophia',
        weidex.instance.address,
        'withdraw',
        {
            args: `(${token},${amount})`,
            options: {
                ttl: config.ttl,
            },
            abi: 'sophia',
        }
    );

    const result = await deposited.decode('bool');
    return result.value;
}

async function getBalanceOf(caller, user, token) {
    const balance = await caller.contractCall(
        weidex.compiled.bytecode,
        'sophia',
        weidex.instance.address,
        'balanceOf',
        {
            args: `(${user},${token})`,
            options: {
                ttl: config.ttl,
            },
            abi: 'sophia',
        }
    );

    const result = await balance.decode('int');
    return result.value;
}
