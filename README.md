# @dingocoin-js/accumulator
JavaScript library to help implement accumulator-style programs over Dingocoin blocks.

### What is an accumulator-style program?
Accumulator-style programs derive its name from the concept of 
[accumulators in functional programming](https://en.wikipedia.org/wiki/Fold_(higher-order_function)).

An accumulator-style program scans through each block in the Dingocoin blockchain sequentially, executing the same function for each block.
The callback allows the user to modify state variables in their script, which are persisted onto the callback for the next block. 
Thus, such a program is said to _accumulate_ to the program state, through calling the callback sequentially across the blocks.

## Installation
`npm install @dingocoin-js/accumulator`

## Usage
```
// Import accumulator package.
const accumulator = require('@dingocoin-js/accumulator');

// Import RPC package to interact with Dingocoin daemon.
// This is installed automatically with @dingocoin-js/accumulator.
const nodeRpc = require('@dingocoin-js/node-rpc');

// Create RPC client using default cookie path (~/.dingocoin/.cookie).
const rpcClient = nodeRpc.fromCookie();

/* 
 * Example 1: Accumulator program to print every block.
 *
 * This example does not maintain any program state.
 */
const acc1 = new Accumulator(
    rpcClient, // Needed to read blocks from the Dingocoin blockchain.
    1, // (Inclusive) block height to start scanning from. Must be >= 1.
    3, // Use 3 confirmations before processing a block.
    async (height, block) => { // Program callback function.
      console.log(height, block);
    },
    async (height) => { // Program rollback function.
      throw new Error("Unexpected rollback");
    });
acc1.start(); // Run accumulator program.


/* 
 * Example 2: Accumulator program to count how user transactions exist.
 * 
 * A user transaction is defined as one that does not correspond to
 * a block reward payout. Block reward payouts are identified by the presence
 * of a vin with type === 'coinbase'.
 *
 * This example maintains a program state, namely the variable `count` which
 * tracks the number of user transactons.
 */
let count = 0;
const acc2 = new Accumulator(rpcClient, 1, 0,
    async (height, block) => {
      for (const tx of block.txs) {
        if (!block.vins.some((x) => x.type === 'coinbase')) {
          count += 1;
        }
      }
    },
    async (height) => { 
      throw new Error("Unexpected rollback"); 
    });
acc2.start(); // Run accumulator program.

```

## Block structure

The structure of each block is as follows:
```
// Each block is a list of transactions.
[ 
  // Each transaction contains a vins list and vouts list.
  {
    // List of vins in the transaction.
    vins: 
    [
      // Each vin has the following structure.
      {
        type: "pubkeyhash" <OR> "pubkey" <OR> "scripthash",
        value: "....",
        vout: ...,
        address: "..."
      },
      ...
    ],
    // List of vouts in the transaction.
    vouts: 
    [
      // This structure is used for P2PKH, P2SH vouts.
      {
        type: "pubkeyhash" <OR> "pubkey" <OR> "scripthash",
        value: "....",
        vout: ...,
        address: "..."
      },
      // This structure is used for OP_RETURN vouts.
      {
        type: "nulldata",
        data: "....",
      },
      ...
    ]
  },
  ...
]
```

## Accumulator rollback
It is common for the blockchain to have small re-orgs, causing the latest few blocks to switch to another string completely.
This often happens when latency in the network causes forks to grow separately. A node that was on one chain will switch to
another chain, if the amount of work done for the other chain is larger. This is precisely the [Proof-of-Work (PoW) consensus mechanism](https://www.investopedia.com/terms/p/proof-work.asp).

When writing an accumulator-style program, we recommend using a large enough confirmation window. This reduces the possibility that blocks are invalidated
due to re-orgs, **after** they have been processed by the accumulator's callback. Otherwise, a re-org will cause the program state to de-sync. 

If such re-orgs are inevitable, the user can handle them cleanly by passing a rollback function `(height) => { ... }` to the `Accumulator` constructor. 
The rollback function would contain program-specific logic to revert the program state back to some height.
It then returns the height of the next block, which informs the `Accumulator` where to resume scanning the blocks from.
The `height` argument is the height of the would-be block if the re-org did not occur. 

## More examples
Below is a list of realistic use cases of accumulator-style programs:
- [Dingocoin staking program](https://github.com/dingocoin/dingostake/blob/master/app.js) - blocks are scanned for transactions which deposit exact multiples
of 100,000 coins into addresses. These are counted as a stake for the address. Deployed [live](https://dingocoin.org/stake).

## Testing (mocha)
`npm test`

## Contributing
Please create a PR or drop a message in our community.

## Community
- [Dev forum](https://dev.dingocoin.org)
- [General Discord](https://discord.gg/y3J946HFQM)
- [Other channels](https://dingocoin.org/community)
