const config = require('./utils/config');
const { getAddress } = require('./utils/utils');
const { getWallets } = require('./utils/wallets');
const messages = require('./utils/error-messages');

const {
    init,
    mint,
    deposit,
    withdraw,
    getBalanceOf,
    getAvailableBalanceOf,
    placeOrder,
} = require('./utils/wrapper');

const { deployContract } = require('./utils/deploy');

let tokenAddress;

describe('Withdraw', () => {
    let owner;
    let alice;
    let bob;

    before(async () => {
        const wallets = await getWallets();
        [owner, alice, bob] = wallets;

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

    it('should withdraw tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, 0);
        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, amount);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await withdraw(alice, token, amount);

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, 0);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, 0);
    });

    it("shouldn't withdraw tokens more than user's balance", async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, 0);

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 100);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await withdraw(alice, token, amount + 1).catch(err =>
            assert.equal(err.error, messages.WITHDRAW_INSUFFICIENT_FUNDS)
        );

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, balanceBefore);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, availableBalanceBefore);
    });

    it("shouldn't withdraw tokens when there are active open orders that lock the token balance", async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 100;

        const inputOrder = {
            sellAmount: amount,
            buyAmount: 20,
            expiration: 1557887965572,
            sellToken: token,
            buyToken: 0,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffee',
        };

        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await placeOrder(alice, inputOrder);

        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, 0);

        await withdraw(alice, token, amount).catch(err => {
            assert.equal(err.error, messages.WITHDRAW_INSUFFICIENT_FUNDS);
        });
    });

    it('should withdraw ae', async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, 100);

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 100);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await withdraw(alice, token, amount);

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, 0);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, 0);
    });

    it("shouldn't withdraw ae more than user's balance", async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, 100);

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 100);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await withdraw(alice, token, amount + 1).catch(err => {
            assert.equal(err.error, messages.WITHDRAW_INSUFFICIENT_FUNDS);
        });

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, balanceBefore);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, availableBalanceBefore);
    });

    it("shouldn't withdraw ae when there are active open orders that lock the token balance", async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        const inputOrder = {
            sellAmount: amount,
            buyAmount: 20,
            expiration: 1557887965572,
            sellToken: token,
            buyToken: tokenAddress,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffed',
        };

        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);

        await placeOrder(alice, inputOrder);

        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, 0);

        await withdraw(alice, token, amount).catch(err => {
            assert.equal(err.error, messages.WITHDRAW_INSUFFICIENT_FUNDS);
        });
    });
});
