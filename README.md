# weidex-ae
Exchange implementation in the official programming language of Aeternity - Sophia.

It's still Work-in-Progress:

+ Few optimization are needed on how orders and order history are stored.

+ Events should be raised on all public stateful functions i.e. Deposit, Withdraw, PlaceOrder, TakeOrder, CancelOrder.

+ Main functionalities are already tested - depositing, withdrawing, placing an order, taking an order, cancelling an order.
Edge case and failure tests should be implemented in a separate files and the main functionallity test should not be changed unless the smart contract source is modified.
