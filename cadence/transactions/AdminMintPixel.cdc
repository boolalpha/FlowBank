import BillyBlocks from 0x01
import FungibleToken from 0x02

// This transaction allows the Minter account to mint an NFT
// and deposit it into its collection.

transaction {

    // The reference to the collection that will be receiving the NFT
    let receiverRef: &{BillyBlocks.PixelBlockCollectionInterfacer}

    // The reference to the Minter resource stored in account storage
    let minterRef: &BillyBlocks.PixelMinter

    prepare(acct: AuthAccount) {
        // Get the owner's collection capability and borrow a reference
        self.receiverRef = acct.getCapability<&{BillyBlocks.PixelBlockCollectionInterfacer}>(BillyBlocks.PixelCollectionPublicPath)
            .borrow()
            ?? panic("Could not borrow receiver reference")

        // Borrow a capability for the NFTMinter in storage
        self.minterRef = acct.borrow<&BillyBlocks.PixelMinter>(from: BillyBlocks.MinterStoragePath)
            ?? panic("could not borrow minter reference")

    }

    execute {
        // Use the minter reference to mint an NFT, which deposits
        // the NFT into the collection that is sent as a parameter.
        //let newNFT = self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault)
        //self.receiverRef.deposit(token: newNFT)
        //self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault)
        let newNFT = self.minterRef.mintNFT(recipient: self.receiverRef, amount: 1, metadataString: "testmetadata", colorHexString: "ffffff");
        log("NFT Minted and deposited to Account's Collection")
    }
}
