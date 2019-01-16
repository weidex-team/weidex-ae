const config = require('./config');
const { arraysEqual } = require('./utils');

let weidex;
let erc20;

module.exports = {
    init,
    mint,
    deposit,
    withdraw,
    getBalanceOf,
    getLockedBalanceOf,
    getAvailableBalanceOf,
    placeOrder,
    cancelOrder,
    getOrders,
    getOrderHistory,
};

function init(exchange, token) {
    weidex = exchange;
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

async function getBalanceOf(caller, user, token) {
    const balance = await callContract(caller, 'balanceOf', weidex, `(${user},${token})`);
    const result = await balance.decode('int');
    return result.value;
}

async function getLockedBalanceOf(caller, user, token) {
    const lockedBalance = await callContract(
        caller,
        'lockedBalanceOf',
        weidex,
        `(${user},${token})`
    );
    const result = await lockedBalance.decode('int');
    return result.value;
}

async function getAvailableBalanceOf(caller, user, token) {
    const availableBalance = await callContract(
        caller,
        'availableBalanceOf',
        weidex,
        `(${user},${token})`
    );
    const result = await availableBalance.decode('int');
    return result.value;
}

async function getOrderHistory(caller, user) {
    const order = await callContract(caller, 'getOrderHistory', weidex, `(${user})`);
    const result = await order.decode(
        'list((string,(int,int,int,int,int,address,address,address,address,string)))'
    );
    return orderListHelper(result.value);
}

async function getOrders(caller, user, token) {
    const userOrders = await callContract(caller, 'getUserOpenOrders', weidex, `(${user})`);
    const tokenOrders = await callContract(caller, 'getTokenOpenOrders', weidex, `${token}`);
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

async function cancelOrder(caller, hash) {
    const balance = await callContract(caller, 'cancelOrder', weidex, `("${hash}")`);
    const result = await balance.decode('bool');
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
