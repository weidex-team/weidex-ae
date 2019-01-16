const config = require('./config');
const { getAddress } = require('./utils');
const { getWallets } = require('./wallets');

const {
    init,
    mint,
    deposit,
    withdraw,
    getBalanceOf,
    getLockedBalanceOf,
    getAvailableBalanceOf,
    placeOrder,
    getOrder,
} = require('./wrapper');

const { deployContract } = require('./deploy');

let exchangeAddress;
let tokenAddress;

describe('WeiDex Contract', () => {
    let owner;
    let alice;
    let bob;

    before(async () => {
        const wallets = await getWallets();
        owner = wallets[0];
        alice = wallets[1];
        bob = wallets[2];

        const erc20 = await deployContract(owner, config.erc20SourcePath);
        assert(erc20.instance, 'could not deploy the ERC20 contract');

        const weidex = await deployContract(owner, config.weidexSourcePath);
        assert(weidex.instance, 'could not deploy the WeiDex contract');

        tokenAddress = getAddress(erc20.instance.address);
        exchangeAddress = getAddress(weidex.instance.address);

        init(weidex, erc20);

        await mint(owner, alice.addr, 10000);
        await mint(owner, bob.addr, 10000);
    });

    it('should deposit erc20 tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 100;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 0);

        const result = await deposit(alice, token, amount, user, user, 0);
        assert(result, 'could not deposit');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, balanceBefore + amount);
    });

    it('should deposit ae', async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 0);

        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, 0);

        const result = await deposit(alice, token, amount, user, user, 100);
        assert(result, 'could not deposit');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, balanceBefore + amount);

        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, availableBalanceBefore + amount);
    });

    it('should withdraw erc20 tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const initialAmount = 100;
        const amount = 50;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, initialAmount);

        const result = await withdraw(alice, token, amount);
        assert(result, 'could not withdraw');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(balanceAfter, balanceBefore - amount);
    });

    it('should withdraw ae', async () => {
        const token = 0;
        const user = alice.addr;
        const initialAmount = 100;
        const amount = 50;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, initialAmount);

        const result = await withdraw(alice, token, amount);
        assert(result, 'could not withdraw');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(balanceAfter, balanceBefore - amount);
    });

    it('should place order', async () => {
        const inputOrder = {
            sellAmount: 10,
            buyAmount: 20,
            expiration: 1557887965572,
            sellToken: 0,
            buyToken: tokenAddress,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffed',
        };

        const lockedBalanceBefore = await getLockedBalanceOf(
            alice,
            alice.addr,
            inputOrder.sellToken
        );
        assert.equal(lockedBalanceBefore, 0);

        const result = await placeOrder(alice, inputOrder);
        assert(result, 'order should be placed');

        const lockedBalanceAfter = await getLockedBalanceOf(
            alice,
            alice.addr,
            inputOrder.sellToken
        );
        assert.equal(lockedBalanceAfter, inputOrder.sellAmount);

        const outputOrder = await getOrder(alice, alice.addr, inputOrder.hash);
    });
});
