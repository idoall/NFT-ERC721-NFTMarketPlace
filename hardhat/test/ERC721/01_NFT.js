const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * 运行测试方法：
 * npx hardhat test test/ERC721/01_NFT.js
 */
describe("NFT MarketPlace Test", () => {


    // NFT 元数据1
    const TOKEN_URI1 = "https://bafybeif5jtlbetjp2nzj64gstexywpp53efr7yynxf4qxtmf5lz6seezia.ipfs.infura-ipfs.io";
    // NFT 元数据2
    const TOKEN_URI2 = "https://bafybeibyb2rdn6raav4ozyxub2r5w4vh3wmw46s6bi54eq7syjzfkmbjn4.ipfs.infura-ipfs.io";

    let owner;
    let addr1;
    let addr2;
    let addrs;

    let nftMarketplaceContractFactory;
    let nftContractFactory;
    let nftMarketplaceContract;
    let nftContract;

    let IDENTITIES;

    beforeEach(async () => {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        IDENTITIES = {
            [owner.address]: "OWNER",
            [addr1.address]: "DEPLOYER",
            [addr2.address]: "BUYER_1",
        }

        var NFTMarketplaceContractName = "NftMarketplace";
        var NFTContractName = "MSHK721NFT"

        // 获取 NFTMarketplace 实例
        nftMarketplaceContractFactory = await ethers.getContractFactory(NFTMarketplaceContractName);
        // 部署 NFTMarketplace 合约
        nftMarketplaceContract = await nftMarketplaceContractFactory.deploy()

        // 获取 nftContract 实例
        nftContractFactory = await ethers.getContractFactory(NFTContractName);
        // 部署 nftContract 合约
        nftContract = await nftContractFactory.deploy()

        console.log(`owner:${owner.address}`)
        console.log(`addr1:${addr1.address}`)
        console.log(`addr2:${addr2.address}`)

        //
        console.log(`${NFTMarketplaceContractName} Token Contract deployed address -> ${nftMarketplaceContract.address}`);

        //
        console.log(`${NFTContractName} Token Contract deployed address -> ${nftContract.address} owner:${await nftContract.owner()}`);

    });

    it("mint and list and buy item", async () => {

        console.log(`Minting NFT for ${addr1.address}`)
        // 为 addr1 铸造一个 NFT
        let mintTx = await nftContract.connect(owner).mintNFT(addr1.address, TOKEN_URI1)
        let mintTxReceipt = await mintTx.wait(1)


        // 非常量(既不pure也不view）函数的返回值仅在函数被链上调用时才可用（即，从这个合约或从另一个合约）
        // 当从链下（例如，从 ethers.js 脚本）调用此类函数时，需要在交易中执行它，并且返回值是该交易的哈希值,因为不知道交易何时会被挖掘并添加到区块链中
        // 为了在从链下调用非常量函数时获得它的返回值，可以发出一个包含将要返回的值的事件
        let tokenId = mintTxReceipt.events[0].args.tokenId


        expect(tokenId).to.equal(1);

        // 授权 市场合约 可以操作这个NFT
        console.log("Approving Marketplace as operator of NFT...")
        let approvalTx = await nftContract
            .connect(addr1)
            .approve(nftMarketplaceContract.address, tokenId)
        await approvalTx.wait(1)

        // NFT交易价格 10 ETH
        let PRICE = ethers.utils.parseEther("10")

        // 将 NFT 加入到列表
        console.log("Listing NFT...")
        let listItemTX = await nftMarketplaceContract
            .connect(addr1)
            .listItem(nftContract.address, tokenId, PRICE)
        await listItemTX.wait(1)
        console.log("NFT Listed with token ID: ", tokenId.toString())

        const mintedBy = await nftContract.ownerOf(tokenId)

        // 检查 nft 的 owner 是否为 addr1
        expect(mintedBy).to.equal(addr1.address)

        console.log(`NFT with ID ${tokenId} minted and listed by owner ${mintedBy} with identity ${IDENTITIES[mintedBy]}. `)

        //---- Buy 

        // 根据 tokenId 获取 NFT
        let listing = await nftMarketplaceContract.getListing(nftContract.address, tokenId)
        let price = listing.price.toString()

        // 使用 addr2    从 nftMarketplaceContract 买入 TOKEN_ID 为 0 的NFT
        const buyItemTX = await nftMarketplaceContract
            .connect(addr2)
            .buyItem(nftContract.address, tokenId, {
                value: price,
            })
        await buyItemTX.wait(1)
        console.log("NFT Bought!")

        const newOwner = await nftContract.ownerOf(tokenId)
        console.log(`New owner of Token ID ${tokenId} is ${newOwner} with identity of ${IDENTITIES[newOwner]} `)

        //---- proceeds
        const proceeds = await nftMarketplaceContract.getProceeds(addr1.address)

        const proceedsValue = ethers.utils.formatEther(proceeds.toString())
        console.log(`Seller ${owner.address} has ${proceedsValue} eth!`)

        //---- withdrawProceeds
        const addr1OldBalance = await ethers.provider.getBalance(addr1.address);
        await nftMarketplaceContract.connect(addr1).withdrawProceeds()
        const addr1NewBalance = await ethers.provider.getBalance(addr1.address);
        console.log(`${addr1.address}  old:${ethers.utils.formatEther(addr1OldBalance)} eth,withdrawProceeds After:${ethers.utils.formatEther(addr1NewBalance)} eth!`)

    });


    it("update and cancel nft item", async () => {
        // 为 addr2 铸造一个 NFT
        let mintTx = await nftContract.connect(owner).mintNFT(addr2.address, TOKEN_URI2)
        let mintTxReceipt = await mintTx.wait(1)


        // 非常量(既不pure也不view）函数的返回值仅在函数被链上调用时才可用（即，从这个合约或从另一个合约）
        // 当从链下（例如，从 ethers.js 脚本）调用此类函数时，需要在交易中执行它，并且返回值是该交易的哈希值,因为不知道交易何时会被挖掘并添加到区块链中
        // 为了在从链下调用非常量函数时获得它的返回值，可以发出一个包含将要返回的值的事件
        let tokenId = mintTxReceipt.events[0].args.tokenId

        // 授权 市场合约 可以操作这个NFT
        console.log("Approving Marketplace as operator of NFT...")
        approvalTx = await nftContract.connect(addr2).approve(nftMarketplaceContract.address, tokenId)
        await approvalTx.wait(1)

        // NFT交易价格 0.1 ETH
        PRICE = ethers.utils.parseEther("0.1")

        // 将 NFT 加入到列表
        console.log("Listing NFT...")
        listItemTX = await nftMarketplaceContract.connect(addr2).listItem(nftContract.address, tokenId, PRICE)
        await listItemTX.wait(1)
        console.log("NFT Listed with token ID: ", tokenId.toString())


        console.log(`Updating listing for token ID ${tokenId} with a new price`)

        listing = await nftMarketplaceContract.getListing(nftContract.address, tokenId)
        let oldPrice = listing.price.toString()
        console.log(`oldPrice:  ${ethers.utils.formatEther(oldPrice.toString())}`)

        // 更新价格
        const updateTx = await nftMarketplaceContract.connect(addr2).updateListing(nftContract.address, tokenId, ethers.utils.parseEther("0.5"))

        // 等待链上处理
        const updateTxReceipt = await updateTx.wait(1)

        // 从事件中获取更新的价格
        const updatedPrice = updateTxReceipt.events[0].args.price
        console.log(`updated price:  ${ethers.utils.formatEther(updatedPrice.toString())}`)

        // 获取信息，确认价格是否有变更.
        const updatedListing = await nftMarketplaceContract.getListing(
            nftContract.address,
            tokenId
        )
        console.log(`Updated listing has price of ${ethers.utils.formatEther(updatedListing.price.toString())}`)

        //----------cancel
        let tx = await nftMarketplaceContract.connect(addr2).cancelListing(nftContract.address, tokenId)
        await tx.wait(1)
        console.log(`NFT with ID ${tokenId} Canceled...`)

        // Check cancellation.
        const canceledListing = await nftMarketplaceContract.getListing(nftContract.address, tokenId)
        console.log("Seller is Zero Address (i.e no one!)", canceledListing.seller)
    });

});
