// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "hardhat/console.sol";

contract MSHK721NFT is ERC721URIStorage, Ownable {
    // 递增递减计数器
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // 声明事件
    event NFTMinted(uint256 indexed tokenId);

    constructor() ERC721("MSHKNFT", "MyNFT") {}

    /**
     * 制作NFT,返回铸造的 NFT ID
     * @param recipient 接收新铸造NFT的地址.
     * @param tokenURI 描述 NFT 元数据的 JSON 文档
     */
    function mintNFT(address recipient, string memory tokenURI)
        external
        onlyOwner
        returns (uint256)
    {
        // 递增
        _tokenIds.increment();

        // 获取当前新的 TokenId
        uint256 newTokenId = _tokenIds.current();

        // 铸造NFT
        _safeMint(recipient, newTokenId);

        // 保存NFT URL
        _setTokenURI(newTokenId, tokenURI);

        // 注册事件
        emit NFTMinted(newTokenId);

        return newTokenId;
    }

    function getTokenCounter() public view returns (uint256) {
        return _tokenIds.current();
    }
}
