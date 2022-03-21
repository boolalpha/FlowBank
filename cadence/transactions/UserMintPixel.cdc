import BillyBlocks from 0x01
import FungibleToken from 0x02

// This transaction allows the Minter account to mint an NFT
// and deposit it into its collection.

transaction {

    // The reference to the collection that will be receiving the NFT
    let receiverRef: &{BillyBlocks.PixelBlockCollectionInterfacer}

    // The reference to the Minter resource stored in account storage
    let minterRef: &{BillyBlocks.UserPixelMinter}

    // Vault that will hold the tokens that will be used to
    // but the NFT
    let temporaryVault: @FungibleToken.Vault

    prepare(acct: AuthAccount) {
        // Get the owner's collection capability and borrow a reference
        self.receiverRef = acct.getCapability<&{BillyBlocks.PixelBlockCollectionInterfacer}>(BillyBlocks.PixelCollectionPublicPath)
            .borrow()
            ?? panic("Could not borrow receiver reference")

        // Borrow a capability for the NFTMinter in storage
        //self.minterRef = acct.borrow<&BillyBlocks.PixelMinter>(from: BillyBlocks.MinterPublicPath)
            //?? panic("could not borrow minter reference")
        //self.minterRef = acct.borrow<&{BillyBlocks.UserPixelMinter}>(from: BillyBlocks.MinterStoragePath)
            //?? panic("could not borrow minter reference")
        self.minterRef = getAccount(0x01).getCapability<&{BillyBlocks.UserPixelMinter}>(BillyBlocks.MinterPublicPath)
            .borrow()
            ?? panic("could not borrow minter reference")

        let vaultRef = acct.borrow<&FungibleToken.Vault>(from: /storage/MainVault)
            ?? panic("Could not borrow user's vault reference")

        // withdraw tokens from the buyers Vault
        self.temporaryVault <- vaultRef.withdraw(amount: 1.0)
    }

    execute {
        // Use the minter reference to mint an NFT, which deposits
        // the NFT into the collection that is sent as a parameter.
        //let newNFT = self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault)
        //self.receiverRef.deposit(token: newNFT)
        self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault, amount: 1, metadataString: "testmetadata", colorHexString: "ffffff")
        log("NFT Minted and deposited to Account's Collection")
    }
}
