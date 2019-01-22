const config = require('./utils/config');
const { getAddress } = require('./utils/utils');
const { getWallets } = require('./utils/wallets');
const messages = require('./utils/error-messages');

const {
    init,
    mint,
    deposit,
    getBalanceOf,
    getAvailableBalanceOf,
    getRefferal,
} = require('./utils/wrapper');

const { deployContract } = require('./utils/deploy');

let tokenAddress;
let referrer;

describe('Deposit', () => {
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

    it('should deposit tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, 0);
        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, amount);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);
    });

    it('should deposit ae', async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, user, amount);
        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, amount);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, amount);
    });

    it("shouldn't deposit ae with invalid amount", async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        const balanceBefore = await getBalanceOf(alice, user, token);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);

        await deposit(alice, token, amount, user, user, amount - 1).catch(err => {
            assert.equal(err.error, messages.DEPOSIT_INVALID_AMOUNT);
        });

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, balanceAfter);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, availableBalanceAfter);
    });

    it('should have referrer', async () => {
        // TODO: find a better way to compare addresses
        referrer = await getRefferal(alice, alice.addr);
        assert.notEqual(0, referrer);
    });

    it("shouldn't change referrer", async () => {
        const token = 0;
        const user = alice.addr;
        const amount = 100;

        await deposit(alice, token, amount, user, bob.addr, amount);

        const newReferrer = await getRefferal(alice, alice.addr);
        assert.equal(newReferrer, referrer);
    });

    it("shouldn't deposit tokens more than available erc20 balance", async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 1000000;

        const balanceBefore = await getBalanceOf(alice, user, token);
        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);

        await deposit(alice, token, amount, user, bob.addr, 0).catch(err => {
            assert.equal(err.error, messages.DEPOSIT_TOKEN_TRANSFER_FAIL);
        });

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, balanceAfter);
        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, availableBalanceAfter);
    });
});
