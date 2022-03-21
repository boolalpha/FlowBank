// Setup Account

import BillyBlocks from 0x01
//import FungibleToken from 0x02

// This transaction configures a user's account
// to use the NFT contract by creating a new empty collection,
// storing it in their account storage, and publishing a capability
transaction {
    prepare(acct: AuthAccount) {

        // store an empty Collection in contract deployer account storage and link to the Collection in storage
        let collectionMinter = getAccount(0x01).getCapability<&{BillyBlocks.PixelBlockCollectionMinterInterfacer}>(BillyBlocks.CollectionMinterPublicPath)
            .borrow() ??
                panic("Could not get Collection Minter")

        // Create a new empty collection
        //let collection <- BillyBlocks.createEmptyPixelBlock()
        let collection <- collectionMinter.createEmptyPixelBlock()

        // store the empty NFT Collection in account storage
        acct.save<@BillyBlocks.PixelBlockCollection>(<-collection, to: BillyBlocks.PixelCollectionStoragePath)
        log("BillyBlocks PixelCollection created for account!")

        // create a public capability for the Collection
        acct.link<&{BillyBlocks.PixelBlockCollectionInterfacer}>(BillyBlocks.PixelCollectionPublicPath, target: BillyBlocks.PixelCollectionStoragePath)
        log("Public facing capabilities linked for BillyBlocks PixelCollection")

    }
}
 
