const Accumulator = require("../");
const nodeRpc = require("@dingocoin-js/node-rpc");

describe("accumulator", () => {
  const rpcClient = nodeRpc.fromCookie();

  it("Print every 1,000 blocks", async () => {
    const acc = new Accumulator(rpcClient, 1, 0, (h, b) => {
      if (h % 1000 === 0) {
        console.log(JSON.stringify(b));
      }
    });
    await acc.start();
  });
});
