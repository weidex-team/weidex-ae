const config = require('./config');

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
    getOrder,
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

async function getOrder(caller, user, hash) {
    const order = await callContract(caller, 'getOrder', weidex, `(${user},"${hash}")`);
    const result = await order.decode(
        '(int,int,int,int,int,address,address,address,address,string)'
    );

    return {
        sellAmount: result.value[0].value,
        buyAmount: result.value[1].value,
        filled: result.value[2].value,
        status: result.value[3].value,
        expiration: result.value[4].value,
        sellToken: result.value[5].value,
        buyToken: result.value[6].value,
        maker: result.value[7].value,
        taker: result.value[8].value,
        hash: result.value[9].value,
    };
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
