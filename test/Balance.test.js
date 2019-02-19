const config = require('./utils/config');
const { getAddress } = require('./utils/utils');
const { getWallets } = require('./utils/wallets');

const { init, mint, deposit, getBalanceOf, placeOrder, takeOrder } = require('./utils/wrapper');

const { deployContract } = require('./utils/deploy');

let tokenAddress;

describe('Balance test', () => {
    let owner;
    let alice;
    let bob;
    const rawMakerFee = 10000000000000000; // 10^18 = 100%, 10^17 = 10%, 10^16 = 1% ....
    const rawTakerFee = 10000000000000000; // 10^18 = 100%, 10^17 = 10%, 10^16 = 1% ....
    const depositAmount = 1000000;

    before(async () => {
        const wallets = await getWallets();
        [owner, alice, bob] = wallets;
        const erc20 = await deployContract(owner, config.erc20SourcePath);
        assert(erc20.instance, 'could not deploy the ERC20 contract');

        const feeAccount = owner.addr;
        const weidex = await deployContract(
            owner,
            config.weidexSourcePath,
            `(${feeAccount}, ${rawMakerFee}, ${rawTakerFee})`
        );
        assert(weidex.instance, 'could not deploy the WeiDex contract');

        tokenAddress = getAddress(erc20.instance.address);

        init(weidex, erc20);

        await mint(owner, alice.addr, depositAmount);
        await mint(owner, bob.addr, depositAmount);

        await deposit(alice, tokenAddress, depositAmount, alice.addr, owner.addr, 0);
        await deposit(alice, 0, depositAmount, alice.addr, owner.addr, depositAmount);
        await deposit(bob, tokenAddress, depositAmount, bob.addr, owner.addr, 0);
        await deposit(bob, 0, depositAmount, bob.addr, owner.addr, depositAmount);
    });

    it('should have correct balance after take order', async () => {
        const takerFee = rawTakerFee / 1000000000000000000; // 1%
        const makerFee = rawMakerFee / 1000000000000000000; // 1%
        const token = tokenAddress;
        const taker = bob;
        const maker = alice;
        const takerSellAmount = 20000;
        const inputOrder = {
            sellAmount: 10000,
            buyAmount: 20000,
            expiration: 1557887965572,
            sellToken: 0, // ae
            buyToken: token,
            hash: '0x6378dda51724bca215ddc353efa47107dd942b67df300b533f8f556caed0ffea',
        };

        const takerReceivedAmount =
            (inputOrder.sellAmount * takerSellAmount) / inputOrder.buyAmount;

        await placeOrder(maker, inputOrder);

        // taker balance
        const tokenTakerBalanceBefore = await getBalanceOf(taker, taker.addr, token);
        // assert.equal(tokenTakerBalanceBefore, depositAmount);
        const aeTakerBalanceBefore = await getBalanceOf(taker, taker.addr, 0);
        // assert.equal(aeTakerBalanceBefore, depositAmount);

        // // maker balance
        const tokenMakerBalanceBefore = await getBalanceOf(maker, maker.addr, token);
        // assert.equal(tokenMakerBalanceBefore, depositAmount);
        const aeMakerBalanceBefore = await getBalanceOf(maker, maker.addr, 0);
        // assert.equal(aeMakerBalanceBefore, depositAmount);

        // // fee account balance
        const tokenFeeBalanceBefore = await getBalanceOf(owner, owner.addr, token);
        // assert.equal(tokenFeeBalanceBefore, 0);
        const aeFeeBalanceBefore = await getBalanceOf(owner, owner.addr, 0);
        // assert.equal(aeFeeBalanceBefore, 0);

        // maker fee is in tokens
        // taker fee is in ae
        await takeOrder(taker, maker.addr, inputOrder.hash, takerSellAmount);

        const tokenTakerBalanceAfter = await getBalanceOf(taker, taker.addr, token);
        assert.equal(tokenTakerBalanceBefore - takerSellAmount, tokenTakerBalanceAfter, '1');
        const aeTakerBalanceAfter = await getBalanceOf(taker, taker.addr, 0);

        assert.equal(
            aeTakerBalanceBefore + takerReceivedAmount - takerReceivedAmount * takerFee,
            aeTakerBalanceAfter,
            '2'
        );

        const tokenMakerBalanceAfter = await getBalanceOf(maker, maker.addr, token);
        assert.equal(
            tokenMakerBalanceBefore + (takerSellAmount - takerSellAmount * makerFee),
            tokenMakerBalanceAfter,
            '3'
        );
        const aeMakerBalanceAfter = await getBalanceOf(maker, maker.addr, 0);
        assert.equal(aeMakerBalanceBefore - takerReceivedAmount, aeMakerBalanceAfter, '3');

        const tokenFeeBalanceAfter = await getBalanceOf(owner, owner.addr, token);
        assert.equal(tokenFeeBalanceBefore + takerSellAmount * makerFee, tokenFeeBalanceAfter, '4');
        const aeFeeBalanceAfter = await getBalanceOf(owner, owner.addr, 0);
        assert.equal(aeFeeBalanceBefore + takerReceivedAmount * takerFee, aeFeeBalanceAfter, '5');
    });
});
