contract Token =
  public function transfer : (address, int) => bool
  public function transferFrom : (address, address, int) => bool

contract WeiDex =
  record state = 
    {
      tokenOrders : map(address, map(string, order)), 
      users : map(address, user),
      referrals: map(address, address)
    }

  public stateful function init() = 
    {
        tokenOrders = {},
        users={},
        referrals = {}
      }

  record user = 
    {
      balances : map(address, int),
      lockedBalances : map(address, int),
      orderHistory : map(string, order),
      orders : map(string, order)
    }

  // order of the properties is important for memory optimizations
  record order = 
    {
      sellAmount : int,
      buyAmount : int,
      filled : int,
      status : int, // 0: open, 1: partially filled, 2: filled, 3: cancelled, 4: error
      expiration: int, // Chain.timestamp
      sellToken : address,
      buyToken : address,
      maker : address,
      taker : address,
      hash : string
    }

  /************************PUBLIC STATEFUL FUNCTIONS*****************************/  
  public stateful function deposit(
                                    token : Token, 
                                    amount : int, 
                                    beneficiary : address, 
                                    referral : address
                                  ) : bool =
    require(amount > 0, "DEPOSIT_SUB_ZERO_AMOUNT") // the lack of `uint` makes this necessarily
    let value : int = amount
    let user  : address = Call.caller

    if(token.address == #0)
      require(value == Call.value, "DEPOSIT_INVALID_AMOUNT")
    else
      require(token.transferFrom(user, Contract.address, value), "DEPOSIT_TOKEN_TRANSFER_FAIL")
    
    increaseUserBalance(user, token.address, value)

    if(userHasReferrer(user, state.referrals))
      addReferral(user, referral)

    true
   
  public stateful function withdraw(token : Token, amount : int) : bool =
    require(amount > 0, "WITHDRAW_SUB_ZERO_AMOUNT") // the lack of `uint` makes this necessarily
    let user : address = Call.caller
      
    require(availableBalanceOf(user, token.address) >= amount, "WITHDRAW_INSUFFICIENT_FUNDS")

    decreaseUserBalance(user, token.address, amount)
      
    if(token.address == #0)
      Chain.spend(user, amount)
    else
      require(token.transfer(user, amount), "WITHDRAW_TOKEN_TRANSFER_FAIL")

    true

  public stateful function placeOrder( 
                                        sellAmount : int,
                                        buyAmount : int,
                                        expiration : int,
                                        sellToken : address, 
                                        buyToken : address, 
                                        hash : string
                                      ) : bool =
    let maker : address = Call.caller
    let user : user = getUser(maker, state.users)

    require(availableBalanceOf(maker, sellToken) >= sellAmount, "PLACE_INSUFFICIENT_FUNDS")
    require(!userHasOrder(hash, user.orders), "PLACE_ORDER_ALREADY_EXISTS")

    let order : order = 
      {
        sellAmount = sellAmount,
        buyAmount = buyAmount,
        filled = 0,
        status = 0,
        expiration = expiration,
        sellToken = sellToken,
        buyToken = buyToken,
        maker = maker,
        taker = #0,
        hash = hash}
    
    increaseUserLockedBalance(maker, sellToken, sellAmount)
    addUserOrder(maker, hash, order)
    addTokenOrder(sellToken, hash, order)
    true

  public stateful function cancelOrder(hash : string) : bool =
    let maker : address = Call.caller
    let user : user = getUser(maker, state.users)
    require(userHasOrder(hash, user.orders), "CANCEL_INVALID_ORDER")
    let foundOrder : order = getOrderByHash(hash, user.orders)
    require(foundOrder.status < 2, "CANCEL_INVALID") // user should not be able to cancel fully filled or already cancelled orders, because his locked balance will be decreased
    updateUserOrderStatus(maker, hash, 3)
    let updatedOrder : order = updateTokenOrderStatus(hash, foundOrder, 3)
    decreaseUserLockedBalance(maker, foundOrder.sellToken, foundOrder.sellAmount)
    removeOrder(maker, foundOrder.sellToken, hash)
    addOrderHistory(maker, hash, updatedOrder)
    true

  public stateful function takeOrder(maker : address, hash : string, takerSellAmount : int) : bool =
    let taker : address = Call.caller
    let order : order = getOrder(maker, hash)
    require(order.status < 3, "TAKE_ORDER_CANCELLED")
    let takerReceivedAmount : int = getPartialAmount(order.sellAmount, order.buyAmount, takerSellAmount)
    
    // assert conditions
    require(add(order.filled, takerSellAmount) =< order.buyAmount, "TAKE_ORDER_FILLED")
    require(order.expiration > Chain.timestamp, "TAKE_ORDER_EXPIRED")
    require(availableBalanceOf(taker, order.buyToken) >= takerSellAmount, "TAKE_INSUFFICIENT_FUNDS_TAKER")
    require(availableBalanceOf(maker, order.sellToken) >= takerReceivedAmount, "TAKE_INSUFFICIENT_FUNDS_MAKER")
    
    // update user balances
    increaseUserBalance(maker, order.buyToken, takerSellAmount)
    increaseUserBalance(taker, order.sellToken, takerReceivedAmount)
    decreaseUserBalance(maker, order.sellToken, takerReceivedAmount)
    decreaseUserBalance(taker, order.buyToken, takerSellAmount)
    
    // update order history
    let takerHistoryOrder = getTakerHistoryOrder(takerReceivedAmount, taker, order)
    let makerHistoryOrder = getMakerHistoryOrder(takerSellAmount, taker, order)
    addOrderHistory(taker, hash, takerHistoryOrder)
    addOrderHistory(maker, hash, makerHistoryOrder)

    // update user and token orders
    if(add(order.filled, takerSellAmount) == order.buyAmount)
      updateTokenOrderFilledAmountAndStatus(hash, order, takerSellAmount, 2)
      updateUserOrderFilledAmountAndStatus(maker, hash, takerSellAmount, 2)
      removeOrder(maker, order.sellToken, hash) // if order is fully filled remove it from the open orders
    else
      updateTokenOrderFilledAmountAndStatus(hash, order, takerSellAmount, 1)
      updateUserOrderFilledAmountAndStatus(maker, hash, takerSellAmount, 1)
    true

  /************************PUBLIC VIEW FUNCTIONS*****************************/  
  public function userHasReferrer(user : address, referrals : map(address, address)) : bool =
    Map.member(user, referrals)

  public function balanceOf(who: address, token : address) : int =
    let user : user = getUser(who, state.users)
    let balance : int = lookupByAddress(token, user.balances, 0)
    balance
  
  public function lockedBalanceOf(who: address, token : address) : int =
    let user : user = getUser(who, state.users)
    let lockedBalance : int = lookupByAddress(token, user.lockedBalances, 0)
    lockedBalance

  public function availableBalanceOf(who: address, token : address) : int =
    let balance : int = balanceOf(who, token)
    let lockedBalance : int = lockedBalanceOf(who, token)
    let availableBalance : int = sub(balance, lockedBalance)
    availableBalance

  public function getUserOpenOrders(who : address) : list((string, order)) =
    let user : user = getUser(who, state.users)
    let openOrders : list((string, order)) = Map.to_list(user.orders)
    openOrders
  
  public function getTokenOpenOrders(token : address) : list((string, order)) =
    let tokenOrders : list((string, order)) = Map.to_list(state.tokenOrders[token])
    tokenOrders

  public function getOrderHistory(who : address) : list((string, order)) =
    let user : user = getUser(who, state.users)
    let orderHistory : list((string, order)) = Map.to_list(user.orderHistory)
    orderHistory
  /************************PRIVATE STATEFUL FUNCTIONS*****************************/  
  private stateful function addReferral(user : address, referral : address) =
    put(state{referrals[user] = referral})
  
  private stateful function addUserOrder(user : address, hash : string, order : order) =                         
    put(state{users @ old_users = 
      old_users{[user] @ old_user = old_user{orders @ old_orders = old_orders{[hash] = order}}}})

  private stateful function addTokenOrder(token: address, hash : string, order : order) =
    let newTokenOrders :  map(address, map(string, order)) = 
      state.tokenOrders{[token = {[hash] = order}] @ previousOrders = previousOrders{[hash] = order}}
    put(state{tokenOrders=newTokenOrders})

  private stateful function updateUserOrder(maker : address, hash : string, newOrder : order) =
    let newUserOrders : map(string, order) = state.users[maker].orders{[hash] = newOrder}
    let newUser : user = state.users[maker]{orders = newUserOrders}
    let newUsers : map(address, user) = state.users{[maker] = newUser}
    put(state{users = newUsers})
  
  private stateful function updateUserOrderStatus(maker : address, hash : string, status : int) = 
    let newUserOrder : order = state.users[maker].orders[hash]{status = status}
    updateUserOrder(maker, hash, newUserOrder)
  
  private stateful function updateUserOrderFilledAmountAndStatus(maker : address, hash : string, filled : int, status : int) = 
    let newUserOrder : order = state.users[maker].orders[hash]{filled @ f = f + filled, status = status}
    updateUserOrder(maker, hash, newUserOrder)

  private stateful function updateTokenOrderStatus(hash : string, order : order, status : int) : order =
    let cancelledOrder : order = order{status = status}
    let newTokenOrders : map(address, map(string, order)) = 
      state.tokenOrders{[order.buyToken = 
        {[hash] = cancelledOrder}] @ previousOrders = previousOrders{[hash] = cancelledOrder}}
    put(state{tokenOrders=newTokenOrders})
    cancelledOrder

  private stateful function updateTokenOrderFilledAmountAndStatus(hash : string, order :order, filled : int, status : int) =
    let filledOrder : order = order{filled @ f = f + filled, status = status}
    let newTokenOrders : map(address, map(string, order)) = 
      state.tokenOrders{[order.buyToken = 
        {[hash] = filledOrder}] @ previousOrders = previousOrders{[hash] = filledOrder}}
    put(state{tokenOrders=newTokenOrders})

  private stateful function updateBalance(who : address, balance : map(address,int)) =
    let newUser : user = state.users[who]{balances = balance}
    let newUsers : map(address, user) = state.users{[who] = newUser}
    put(state{users = newUsers})
  
  private stateful function updateLockedBalance(who : address, lockedBalances : map(address,int)) =
    let newUser : user = state.users[who]{lockedBalances = lockedBalances}
    let newUsers : map(address, user) = state.users{[who] = newUser}
    put(state{users = newUsers})

  private stateful function decreaseUserBalance(who : address, token : address, amount : int) =
    let currentBalance : int = balanceOf(who, token)
    let newUserBalance : map(address,int) = 
      state.users[who].balances{[token] = sub(currentBalance, amount)}
    updateBalance(who, newUserBalance)

  private stateful function increaseUserBalance(who : address, token : address, amount : int) =
    let currentBalance : int = balanceOf(who, token)
    let newUserBalance : map(address,int) = 
      state.users[who].balances{[token] = add(currentBalance, amount)}
    updateBalance(who, newUserBalance)
  
  private stateful function decreaseUserLockedBalance(who : address, token : address, amount : int) =
    let currentLockedBalance : int = balanceOf(who, token)
    let newLockedBalance : map(address,int) = 
      state.users[who].lockedBalances{[token] = sub(currentLockedBalance, amount)}
    updateLockedBalance(who, newLockedBalance)

  private stateful function increaseUserLockedBalance(who : address, token : address, amount : int) =
    let currentLockedBalance : int = balanceOf(who, token)
    let newLockedBalance : map(address,int) = 
      state.users[who].lockedBalances{[token] = add(currentLockedBalance, amount)}
    updateLockedBalance(who, newLockedBalance)
  
  private stateful function deleteUserOrder(user : address, hash : string) =
    let newUser : user = state.users[user]{orders @ o = Map.delete(hash, o)}
    let newUsers : map(address, user) = state.users{[user] = newUser}
    put(state{users = newUsers})
  
  private stateful function deleteTokenOrder(token : address, hash : string) =
    let newTokenOrders : map(address, map(string, order)) = 
      state.tokenOrders{[token] @ previousOrders = Map.delete(hash, previousOrders)}
    put(state{tokenOrders=newTokenOrders})
  
  private stateful function removeOrder(user : address, token : address, hash : string) =
    deleteUserOrder(user, hash)
    deleteTokenOrder(token, hash)
  
  private stateful function addOrderHistory(user : address, hash : string, order : order) =                         
    put(state{users @ old_users = 
      old_users{[user] @ old_user = old_user{orderHistory @ old_orders = old_orders{[hash] = order}}}})

  /************************PRIVATE VIEW FUNCTIONS*****************************/
  private function getOrder(who : address, hash : string) : order =
    let user : user = getUser(who, state.users)
    require(userHasOrder(hash, user.orders), "GET_ORDER_INVALID_ORDER")
    let foundOrder : order = getOrderByHash(hash, user.orders)
    foundOrder
  
  private function getUser(who : address, users : map(address, user)) : user =
    let user : user = lookupByAddress(who, users, {balances={}, lockedBalances={}, orderHistory= {}, orders={}})
    user 
  
  private function userHasOrder(hash: string, orders : map(string, order)) : bool =
    Map.member(hash, orders)
    
  private function getMakerHistoryOrder(filled : int, taker : address, order : order) : order = 
    let makerOrder : order = order{taker = taker, filled = filled}
    makerOrder

  private function getTakerHistoryOrder(filled : int, taker : address, order : order) : order = 
    let takerOrder : order = order{buyToken = 
      order.sellToken, sellToken = order.buyToken, taker = taker, filled = filled}
    takerOrder

  private function lookupByAddress(k : address, m, v) =
    switch(Map.lookup(k, m))
      None    => v
      Some(x) => x

  private function getOrderByHash(hash : string, orders : map(string, order)) =
    switch(Map.lookup(hash, orders))
      None    => { 
                    sellAmount = 0, 
                    buyAmount = 0, 
                    filled = 0, 
                    status = 4, 
                    expiration = 0, 
                    sellToken = #0, 
                    buyToken = #0, 
                    maker = #0, 
                    taker = #0, 
                    hash = "0"
                  }
      Some(x) => x

  /************************SAFE MATH*****************************/
  private function add(a : int, b : int) : int =
    let c : int = a + b
    require(c >= a, "Overflow error")
    c
  
  private function sub(a : int, b : int) : int =
    require(b =< a, "Underflow error")
    a - b

  private function mul(a : int, b : int) : int =
    let c : int = a * b
    require(c / a == b, "MUL_ERROR")
    c
  
  private function div(a : int, b : int) : int =
    require(b > 0, "DIVIDE_ZERO")
    let c : int = a / b
    c

  /************************MATH HELPER*****************************/
  private function getPartialAmount(numerator : int, denominator : int, target : int) : int =
    let partialAmount = div(mul(numerator, target), denominator)
    partialAmount
  
  private function getFeeAmount(numerator : int, target : int) : int =
    let feeAmount = div(mul(numerator, target), 10 ^ 18)
    feeAmount

  /************************ASSERT*****************************/
  private function require(b : bool, err : string) =
    if(!b)
      abort(err)