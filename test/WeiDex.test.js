const config = require('./utils/config');
const { getAddress } = require('./utils/utils');
const { getWallets } = require('./utils/wallets');

const {
    init,
    mint,
    deposit,
    withdraw,
    getBalanceOf,
    getAvailableBalanceOf,
    placeOrder,
    takeOrder,
    cancelOrder,
    getOrders,
    getOrderHistory,
    getOpenBuyOrdersByUserAndToken,
} = require('./utils/wrapper');

const { deployContract } = require('./utils/deploy');

let exchangeAddress;
let tokenAddress;

describe('WeiDex Contract', () => {
    let owner;
    let alice;
    let bob;

    before(async () => {
        const wallets = await getWallets();
        [owner, alice, bob] = wallets;

        const erc20 = await deployContract(owner, config.erc20SourcePath);
        assert(erc20.instance, 'could not deploy the ERC20 contract');

        const rawMakerFee = 10000000000000000; // 10^18 = 100%, 10^17 = 10%, 10^16 = 1% ....
        const rawTakerFee = 10000000000000000; // 10^18 = 100%, 10^17 = 10%, 10^16 = 1% ....
        const feeAccount = owner.addr;

        const weidex = await deployContract(
            owner,
            config.weidexSourcePath,
            `(${feeAccount}, ${rawMakerFee}, ${rawTakerFee})`
        );
        assert(weidex.instance, 'could not deploy the WeiDex contract');

        tokenAddress = getAddress(erc20.instance.address);
        exchangeAddress = getAddress(weidex.instance.address);

        init(weidex, erc20);

        await mint(owner, alice.addr, 100000000);
        await mint(owner, bob.addr, 100000000);
    });

    it('should deposit erc20 tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const amount = 1000000;

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
        const amount = 1000000;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, 0);

        const availableBalanceBefore = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceBefore, 0);

        const result = await deposit(alice, token, amount, user, user, amount);
        assert(result, 'could not deposit');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert.equal(balanceAfter, balanceBefore + amount);

        const availableBalanceAfter = await getAvailableBalanceOf(alice, user, token);
        assert.equal(availableBalanceAfter, availableBalanceBefore + amount);
    });

    it('should withdraw erc20 tokens', async () => {
        const token = tokenAddress;
        const user = alice.addr;
        const initialAmount = 1000000;
        const amount = 500;

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
        const initialAmount = 1000000;
        const amount = 500;

        const balanceBefore = await getBalanceOf(alice, user, token);
        assert.equal(balanceBefore, initialAmount);

        const result = await withdraw(alice, token, amount);
        assert(result, 'could not withdraw');

        const balanceAfter = await getBalanceOf(alice, user, token);
        assert(balanceAfter, balanceBefore - amount);
    });

    it('should place order', async () => {
        const inputOrder = {
            sellAmount: 10000,
            buyAmount: 20000,
            expiration: 1557887965572,
            sellToken: 0,
            buyToken: tokenAddress,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffed',
        };

        const availableBalanceBefore = await getAvailableBalanceOf(
            alice,
            alice.addr,
            inputOrder.sellToken
        );

        const result = await placeOrder(alice, inputOrder);
        assert(result, 'order should be placed');

        const aliceOpenOrders = await getOpenBuyOrdersByUserAndToken(
            alice,
            alice.addr,
            tokenAddress
        );
        assert.equal(aliceOpenOrders.length, 1);

        const bobOpenOrders = await getOpenBuyOrdersByUserAndToken(alice, bob.addr, tokenAddress);
        assert.equal(bobOpenOrders.length, 0);

        const availableBalanceAfter = await getAvailableBalanceOf(
            alice,
            alice.addr,
            inputOrder.sellToken
        );
        assert.equal(availableBalanceAfter, availableBalanceBefore - inputOrder.sellAmount);

        const { orders, valid } = await getOrders(alice, alice.addr, 0);
        assert.equal(valid, true);
        assert.equal(orders.length, 1);
        assert.equal(orders[0].status, 0);
        assert.equal(orders[0].filled, 0);
        assert.equal(orders[0].taker, 0);
        assert.equal(orders[0].hash, inputOrder.hash);
    });

    it('should cancel order', async () => {
        const hash = '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffed';
        const token = 0;

        const availableBalanceBefore = await getAvailableBalanceOf(alice, alice.addr, token);

        const result = await cancelOrder(alice, hash);
        assert(result, 'order should be cancelled');

        const availableBalanceAfter = await getAvailableBalanceOf(alice, alice.addr, token);
        assert.equal(availableBalanceAfter, availableBalanceBefore + 10000);

        const history = await getOrderHistory(alice, alice.addr);
        assert.equal(history[0].status, 3);
    });

    it('should fully take order', async () => {
        const token = tokenAddress;
        const depositAmount = 1000000;
        const taker = bob.addr;
        const takerSellAmount = 20000;
        const inputOrder = {
            sellAmount: 10000,
            buyAmount: 20000,
            expiration: 1557887965572,
            sellToken: 0,
            buyToken: tokenAddress,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffea',
        };

        await deposit(bob, token, depositAmount, taker, taker, 0);
        await placeOrder(alice, inputOrder);

        const result = await takeOrder(bob, alice.addr, inputOrder.hash, takerSellAmount);
        assert(result, 'order should be taken');

        // order should not be open anymore
        const { orders, valid } = await getOrders(alice, alice.addr, 0);
        assert.equal(valid, true);
        assert.equal(orders.length, 0);

        // maker should have new order in the history
        // filled amount is the amount received by the maker
        const makerHistory = await getOrderHistory(alice, alice.addr);
        assert.equal(makerHistory.length, 2); // the cancelled order is also in the history
        assert.equal(makerHistory[0].filled, 20000);
        assert.equal(makerHistory[0].sellToken, 0);

        // taker should have new order in the history
        // filled amount is the amount received by the taker
        const takerHistory = await getOrderHistory(bob, bob.addr);
        assert.equal(takerHistory.length, 1);
        assert.equal(takerHistory[0].filled, 10000);
        assert.equal(takerHistory[0].buyToken, 0);
    });

    it('should partially take order', async () => {
        const token = tokenAddress;
        const depositAmount = 1000000;
        const taker = bob.addr;
        const takerSellAmount = 10000;
        const inputOrder = {
            sellAmount: 10000,
            buyAmount: 20000,
            expiration: 1557887965572,
            sellToken: 0,
            buyToken: tokenAddress,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffeb',
        };

        await deposit(bob, token, depositAmount, taker, taker, 0);
        await placeOrder(alice, inputOrder);

        const result = await takeOrder(bob, alice.addr, inputOrder.hash, takerSellAmount);
        assert(result, 'order should be taken');

        // order should not be open anymore
        const { orders, valid } = await getOrders(alice, alice.addr, 0);
        assert.equal(valid, true);
        assert.equal(orders.length, 1);
        assert.equal(orders[0].status, 1);
        assert.equal(orders[0].filled, 10000);

        // maker should have new order in the history
        // filled amount is the amount received by the maker
        const makerHistory = await getOrderHistory(alice, alice.addr);
        assert.equal(makerHistory.length, 3); // the cancelled order is also in the history
        assert.equal(makerHistory[1].filled, 10000);
        assert.equal(makerHistory[1].sellToken, 0);

        // taker should have new order in the history
        // filled amount is the amount received by the taker
        const takerHistory = await getOrderHistory(bob, bob.addr);
        assert.equal(takerHistory.length, 2);
        assert.equal(takerHistory[1].filled, 5000);
        assert.equal(takerHistory[1].buyToken, 0);
    });
});
