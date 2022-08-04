
const { deployments, getNamedAccounts } = require("hardhat");
const { deploy, log } = deployments

async function main() {

    // 获取部署的用户
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = 1
    console.log("----------------------------------------------------")
    console.log(`deployer address -> ${deployer}`);
    const arg = []
    // 参考 ： https://github.com/wighawag/hardhat-deploy#deploymentsdeployname-options
    const tokenContrace = await deploy("NftMarketplace", {
        from: deployer, // 将执行交易的地址（或私钥）。 您可以使用 `getNamedAccounts` 按名称检索您想要的地址。
        args: arg,    // 构造函数的参数列表
        log: true,  // 它将记录部署的结果（tx 哈希、地址和使用的气体）
        waitConfirmations: waitBlockConfirmations,  // 交易被包含在链中后等待的确认数
    })

    console.log(`NftMarketplace Contract deployed address -> ${tokenContrace.address}`);

    // log("Verifying...")
    // // 使用合约地址和参数 验证合约
    // await verify(tokenContrace.address, arguments)

    console.log("----------------------------------------------------")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
