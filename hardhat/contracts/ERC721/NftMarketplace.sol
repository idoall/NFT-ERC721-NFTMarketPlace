// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Check out https://github.com/Fantom-foundation/Artion-Contracts/blob/5c90d2bc0401af6fb5abf35b860b762b31dfee02/contracts/FantomMarketplace.sol
// For a full decentralized nft marketplace

// 从Solidity v0.8.4开始，有一种方便且省 gas 的方式可以通过使用自定义错误向用户解释操作失败的原因。
// 错误的语法类似于 事件的语法。它们必须与revert 语句一起使用，这会导致当前调用中的所有更改都被还原并将错误数据传递回调用者
error PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error ItemNotForSale(address nftAddress, uint256 tokenId);
error NotListed(address nftAddress, uint256 tokenId);
error AlreadyListed(address nftAddress, uint256 tokenId);
error NoProceeds();
error NotOwner();
error NotApprovedForMarketplace();
error PriceMustBeAboveZero();

contract NftMarketplace is ReentrancyGuard {
    // 保存卖家地址和价格
    struct Listing {
        uint256 price;
        address seller;
    }

    // 加入市场列表事件
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    // 更新事件
    event UpdateListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    // 取消市场列表事件
    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // 买入事件
    event ItemBuy(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    // 保存NFT列表和卖家的对应状态
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // 卖家地址和卖出的总金额
    mapping(address => uint256) private s_proceeds;

    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    // 检查卖家是否在列表中
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NotListed(nftAddress, tokenId);
        }
        _;
    }

    // 检查 NFT 地址的 tokenId owner 是否为 spender
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);

        // 查找NFT的所有者，分配给零地址的 NFT 被认为是无效的，返回NFT持有者地址
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NotOwner();
        }
        _;
    }

    /*
     * @notice 将 NFT 加入到市场列表中，external 表示这是一个外部函数
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param price sale price for each item
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            // 终止运行并撤销状态更改
            revert PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        // 获取单个NFT的批准地址，如果tokenId不是有效地址，抛出异常，
        if (nft.getApproved(tokenId) != address(this)) {
            revert NotApprovedForMarketplace();
        }

        // 存储智能合约状态
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);

        // 注册事件
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    /*
     * @notice 从NFT列表中删除 卖家信息
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);

        // 注册 事件
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    /*
     * @notice 允许买家使用ETH，从卖家列表中买入 NFT
     * nonReentrant 方法 防止合约被重复调用
     * @param nftAddress NFT 合约地址
     * @param tokenId NFT 的通证 ID
     */
    function buyItem(address nftAddress, uint256 tokenId)
        external
        payable
        isListed(nftAddress, tokenId)
        nonReentrant
    {
        // 获取卖家列表，并判断支付的ETH是否小于卖家的价格
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert PriceNotMet(nftAddress, tokenId, listedItem.price);
        }

        // 更新卖家卖出的金额
        s_proceeds[listedItem.seller] += msg.value;
        // Could just send the money...
        // https://fravoll.github.io/solidity-patterns/pull_over_push.html

        // 从卖家列表中删除
        delete (s_listings[nftAddress][tokenId]);

        // 将 NFT（tokenId） 所有权从 listedItem.seller 转移到  msg.sender
        IERC721(nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            tokenId
        );

        //注册买家事件
        emit ItemBuy(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    /*
     * @notice 卖家更新NFT在市场上的价格
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param newPrice Price in Wei of the item
     */
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        isListed(nftAddress, tokenId)
        nonReentrant
        isOwner(nftAddress, tokenId, msg.sender)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit UpdateListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    /*
     * @notice 将ETH转移到其他帐号，同时设置收益余额为0
     */
    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NoProceeds();
        }
        s_proceeds[msg.sender] = 0;

        // 将 ETH 发送到地址的方法，关于此语法更多介绍可以参考下面链接
        // https://ethereum.stackexchange.com/questions/96685/how-to-use-address-call-in-solidity
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer failed");
    }

    /*
     * @notice 获取NFT卖家列表
     */
    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftAddress][tokenId];
    }

    // 获取 seller 卖出的总金额
    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
