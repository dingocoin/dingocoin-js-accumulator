const fold = require("../");
const nodeRpc = require("@dingocoin-js/node-rpc");

describe("fold", () => {
  const rpcClient = nodeRpc.fromCookie();

  it("Print every 10,000 blocks", async () => {
    const f = new fold(rpcClient, 1, 0, (h, b) => {
      if (h % 10000 === 0) {
        console.log(JSON.stringify(b));
      }
    });
    await f.start();
  });
});
