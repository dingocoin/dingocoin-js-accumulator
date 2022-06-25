const nodeRpc = require("@dingocoin-js/node-rpc");
const POLL_INTERVAL = 1000; //  ms.

const parseVout = (vout) => {
  if (vout.scriptPubKey.type === "nulldata") {
    return {
      type: "nulldata",
      data: vout.scriptPubKey.hex,
    };
  } else if (
    ["pubkeyhash", "pubkey", "scripthash"].includes(vout.scriptPubKey.type)
  ) {
    return {
      type: vout.scriptPubKey.type,
      value: vout.value,
      vout: vout.n,
      address: vout.scriptPubKey.addresses[0],
    };
  } else {
    throw new Error("Unsupported vout");
  }
};

const resolveAndParseVin = async (rpcClient, vin) => {
  if (vin.coinbase !== undefined) {
    return { type: "coinbase" };
  } else {
    const vout = (
      await rpcClient.decodeRawTransaction(
        await rpcClient.getRawTransaction(vin.txid)
      )
    ).vout[vin.vout];
    return parseVout(vout);
  }
};

class Accumulator {
  constructor(
    rpcClient,
    initialHeight,
    confirmations = 120,
    onBlock,
    onRollback = (_) => {
      throw new Error("Unexpected rollback");
    }
  ) {
    this.rpcClient = rpcClient;
    this.confirmations = confirmations;
    this.height = initialHeight;
    this.onBlock = onBlock;
    this.onRollback = onRollback;
    this.tip = null;
  }

  start() {
    return (async () => {
      while (true) {
        const targetHeight = (await this.rpcClient.getBlockchainInfo()).blocks;
        while (this.height <= targetHeight - this.confirmations) {
          const block = await this.rpcClient.getBlock(
            await this.rpcClient.getBlockHash(this.height)
          );
          if (this.tip !== null && this.tip.hash !== block.previousblockhash) {
            // Rollback if reorg, then break.
            this.height = await this.onRollback(this.height + 1);
            this.tip = null;
            break;
          } else {
            const txs = [];
            for (const txHash of block.tx.sort()) {
              // Get TX.
              const tx = await this.rpcClient.decodeRawTransaction(
                await this.rpcClient.getRawTransaction(txHash)
              );
              // Parse TX.
              const txParsed = { vins: [], vouts: [] };
              for (const vin of tx.vin) {
                const vinParsed = await resolveAndParseVin(this.rpcClient, vin);
                vinParsed.txid = vin.txid; // Append txid.
                txParsed.vins.push(vinParsed);
              }
              for (const vout of tx.vout) {
                const voutParsed = parseVout(vout);
                voutParsed.txid = txHash; // Append txid.
                txParsed.vouts.push(voutParsed);
              }
              // Add to list.
              txs.push(txParsed);
            }
            await this.onBlock(this.height, { txs: txs });
            this.tip = block;
            this.height = this.height + 1;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
    })();
  }
}

module.exports = Accumulator;
