const config = require('./config');
const { arraysEqual } = require('./utils');

let weidex;
let weidexAddress;
let erc20;

module.exports = {
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
    getBalances,
    getOrderHistory,
    getRefferal,
    getOpenBuyOrdersByUserAndToken,
    getSellOpenOrdersByTokenAddress,
    getTradeHistoryByToken,
};

function init(exchange, token) {
    weidex = exchange;
    weidexAddress = exchange.instance.address;
    erc20 = token;
}

async function mint(caller, address, amount) {
    const minted = await callContract(caller, 'mint', erc20, `(${address},${amount})`);
    const result = await minted.decode('bool');
    assert(result.value, 'could not mint.');
    return result.value;
}

async function deposit(caller, token, amount, beneficiary, referral, ae) {
    const deposited = await callContract(
        caller,
        'deposit',
        weidex,
        `(${token},${amount},${beneficiary},${referral})`,
        ae
    );
    const result = await deposited.decode('bool');
    return result.value;
}

async function withdraw(caller, token, amount) {
    const withdraw = await callContract(caller, 'withdraw', weidex, `(${token},${amount})`);
    const result = await withdraw.decode('bool');
    return result.value;
}

async function placeOrder(caller, order) {
    const balance = await callContract(
        caller,
        'placeOrder',
        weidex,
        `(${order.sellAmount},${order.buyAmount},${order.expiration},
          ${order.sellToken},${order.buyToken},"${order.hash}")`
    );
    const result = await balance.decode('bool');
    return result.value;
}

async function takeOrder(caller, user, hash, takerSellAmount) {
    const balance = await callContract(
        caller,
        'takeOrder',
        weidex,
        `(${user},"${hash}",${takerSellAmount})`
    );
    const result = await balance.decode('bool');
    return result.value;
}

async function cancelOrder(caller, hash) {
    const balance = await callContract(caller, 'cancelOrder', weidex, `("${hash}")`);
    const result = await balance.decode('bool');
    return result.value;
}

async function getBalanceOf(caller, user, token) {
    const balance = await callContractStatic(
        caller,
        'fullBalanceOf',
        weidexAddress,
        `(${user},${token})`
    );
    const result = await balance.decode('int');
    return result.value;
}

async function getAvailableBalanceOf(caller, user, token) {
    const availableBalance = await callContractStatic(
        caller,
        'availableBalanceOf',
        weidexAddress,
        `(${user},${token})`
    );
    const result = await availableBalance.decode('int');
    return result.value;
}

async function getBalances(caller, user) {
    const balance = await callContractStatic(caller, 'getUserBalances', weidexAddress, `(${user})`);
    const result = await balance.decode('list((address, (int, int)))');
    return result.value;
}

async function getRefferal(caller, user) {
    const availableBalance = await callContractStatic(
        caller,
        'getRefferal',
        weidexAddress,
        `(${user})`
    );
    const result = await availableBalance.decode('address');
    return result.value;
}

async function getOrderHistory(caller, user) {
    const order = await callContractStatic(
        caller,
        'getOrderHistoryByUser',
        weidexAddress,
        `(${user})`
    );
    const result = await order.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    return orderListHelper(result.value);
}

async function getOrders(caller, user, token) {
    const userOrders = await callContractStatic(
        caller,
        'getOpenOrdersByUser',
        weidexAddress,
        `(${user})`
    );
    const tokenOrders = await callContractStatic(
        caller,
        'getOpenOrdersByToken',
        weidexAddress,
        `${token}`
    );
    const userOrdersResult = await userOrders.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    const tokenOrdersResult = await tokenOrders.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    const userOrderArray = orderListHelper(userOrdersResult.value);
    const tokenOrderArray = orderListHelper(tokenOrdersResult.value);
    const orderListsEquals = arraysEqual(tokenOrderArray, userOrderArray);

    return { orders: userOrderArray, valid: orderListsEquals };
}

async function getTradeHistoryByToken(caller, token) {
    const userOrders = await callContractStatic(
        caller,
        'getTradeHistoryByToken',
        weidexAddress,
        `(${token})`
    );
    const result = await userOrders.decode(
        'list((int,int,int,int,int,address,address,address,address,string))'
    );
    return result;
}

function orderListHelper(list) {
    let orders = [];

    list.forEach(element => {
        const order = {
            sellAmount: element.value[1].value[0].value,
            buyAmount: element.value[1].value[1].value,
            filled: element.value[1].value[2].value,
            status: element.value[1].value[3].value,
            expiration: element.value[1].value[4].value,
            sellToken: element.value[1].value[5].value,
            buyToken: element.value[1].value[6].value,
            maker: element.value[1].value[7].value,
            taker: element.value[1].value[8].value,
            hash: element.value[1].value[9].value,
        };

        orders.push(order);
    });

    return orders;
}

async function getOpenBuyOrdersByUserAndToken(caller, user, token) {
    const orders = await callContractStatic(
        caller,
        'getOpenBuyOrdersByUserAndToken',
        weidexAddress,
        `(${user}, ${token})`
    );
    const result = await orders.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    return result.value;
}

async function getSellOpenOrdersByTokenAddress(caller, user, token) {
    const orders = await callContractStatic(
        caller,
        'getSellOpenOrdersByTokenAddress',
        weidexAddress,
        `(${user}, ${token})`
    );
    const result = await orders.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    return result.value;
}

async function callContract(caller, fn, contract, args, value) {
    let options = { ttl: config.ttl };
    if (typeof value != 'undefined') {
        options = { ...options, amount: value };
    }
    const result = await caller.contractCall(
        contract.compiled.bytecode,
        'sophia',
        contract.instance.address,
        fn,
        {
            args,
            options,
            abi: 'sophia',
        }
    );

    return result;
}

async function callContractStatic(caller, fn, contract, args) {
    const result = await caller.contractCallStatic(contract, 'sophia-address', fn, {
        args,
        abi: 'sophia',
    });

    return result;
}
