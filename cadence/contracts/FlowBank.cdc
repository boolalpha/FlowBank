//import FungibleToken from 0xee82856bf20e2aa6 //This is emulator addr
import FungibleToken from 0x9a0766d93b6608b7 //This is testnet addr
//import FlowToken from 0xFlowToken


pub contract FlowBank {

   //build the Pixel struct which is the NFT
   pub resource Pixel {
       //all Pixel attributes
       pub let id: UInt256         // The unique ID that differentiates each NFT Pixel
       pub var metadata: String    // String to hold metadata uri
       pub var colorHex: String    // String holding our current hex color


       pub fun setPixelValues(metadata: String, colorHex: String) {
           self.metadata = metadata
           self.colorHex = colorHex
           //set global tracker
           emit PixelEdited(id: self.id, metadata: self.metadata, colorHex: self.colorHex)
       }

       pub fun getPixelValues(): [AnyStruct] {
           return [self.id, self.metadata, self.colorHex]
       }

       // Initialize both fields in the init function
       init(initId: UInt256, initMetadata: String, initColorHex: String) {
           self.id = initId
           self.metadata = initMetadata
           self.colorHex = initColorHex
       }

       destroy() {
           emit PixelDestroyed(id: self.id)
       }
   }

   /*
       Following is for creating a collection and for allowing users to create their collection
   */
   pub resource interface PixelBlockCollectionMinterInterfacer {
       pub fun createEmptyPixelBlock(): @PixelBlockCollection
   }

   pub resource PixelBlockCollectionMinter: PixelBlockCollectionMinterInterfacer {
       pub var lastCollectionId: UInt256

       // creates a new empty Collection resource and returns it
       pub fun createEmptyPixelBlock(): @PixelBlockCollection {
           let newCollection <- create PixelBlockCollection(initCollectionId: self.lastCollectionId)
           //make sure we increment the collection id
           self.lastCollectionId = self.lastCollectionId + 1
           return <- newCollection
       }

       init() {
           self.lastCollectionId = 1
       }
   }

   // We define this interface purely as a way to allow users
   // to create public, restricted references to their NFT Collection.
   // They would use this to only publicly expose the deposit, getIDs,
   // and idExists fields in their Collection
   pub resource interface PixelBlockCollectionInterfacer {

       pub fun depositPixel(token: @Pixel)

       pub var collectionId: UInt256

       pub fun idExists(id: UInt256): Bool

       pub fun getAllPixelIds(): [UInt256]

       pub fun getCollectionPixelsInfo(): [AnyStruct]
   }

   //create the collection resource for holding the pixels
   pub resource PixelBlockCollection: PixelBlockCollectionInterfacer {
       pub var collectionId: UInt256
       pub var ownedPixels: @{UInt256: Pixel}

       // Function that takes a Pixel as an argument and adds it to the collections dictionary
       pub fun depositPixel(token: @Pixel) {
           // add the new token to the dictionary with a force assignment
           // if there is already a value at that key, it will fail and revert
           // we keep copy of all attributes b/c we want to emit event only after the pixel has moved
           let id = token.id
           let metadata = token.metadata
           let colorHex = token.colorHex

           self.ownedPixels[token.id] <-! token
           emit PixelDeposited(collectionId: self.collectionId, id: id, metadata: metadata, colorHex: colorHex)
       }

       /// used to get a pixel out of the collection
       pub fun withdrawPixel(id: UInt256): @Pixel {
           emit PixelWithdrawn(collectionId: self.collectionId, id: id)
           return <- self.ownedPixels.remove(key: id)!
       }

       // idExists checks to see if a NFT with the given ID exists in the collection
       pub fun idExists(id: UInt256): Bool {
           return self.ownedPixels[id] != nil
       }

       //getAllPixelIds returns the ownedPixels keys
       pub fun getAllPixelIds(): [UInt256] {
           return self.ownedPixels.keys
       }

       pub fun getCollectionPixelsInfo(): [AnyStruct] {
           var returnArray: [AnyStruct] = []
           for id in self.ownedPixels.keys {
               returnArray.append(self.ownedPixels[id]?.getPixelValues())
           }
           return returnArray
       }

       init (initCollectionId: UInt256) {
           self.collectionId = initCollectionId
           self.ownedPixels <- {}
       }

       destroy() {
           destroy self.ownedPixels;
       }

   }

   /*
       Next Section Is For Minting Pixel
   */

   //to be used by people to mint their pixel - same as normal mint but costs $1
   pub resource interface UserPixelMinter {
       pub fun userMintPixel(recipient: &AnyResource{PixelBlockCollectionInterfacer}, buyTokens: @FungibleToken.Vault, amount: UInt64, metadataString: String, colorHexString: String)
   }

   // Pixel Minter
   // Resource that would be owned by an admin or by a smart contract
   // that allows them to mint new Pixels when needed
   pub resource PixelMinter: UserPixelMinter {

       // the ID that is used to mint NFTs
       // it is only incremented so that NFT ids remain
       // unique. It also keeps track of the total number of NFTs
       // in existence
       pub var lastTokenId: UInt256
       pub var ownerVault: Capability<&AnyResource{FungibleToken.Receiver}>

       init(initVault: Capability<&AnyResource{FungibleToken.Receiver}>) {
           self.ownerVault = initVault
           self.lastTokenId = 1
       }

       // mintNFT
       // Function that mints a new NFT with a new ID
       // and returns it to the caller
       pub fun mintNFT(recipient: &AnyResource{PixelBlockCollectionInterfacer}, amount: UInt64, metadataString: String, colorHexString: String) {
           var count: UInt64 = 0
           while( count < amount) {
               // create a new NFT
               var newPixel <- create Pixel(initId: self.lastTokenId, initMetadata: metadataString, initColorHex: colorHexString)

               // deposit the NFT into the buyers collection
               recipient.depositPixel(token: <-newPixel)

               //insert into the pixel map
               //self.pixelMap.insertPixel(address: caller, pixel: newPixel.getPixelValues())

               //emit mint/creation event
               emit PixelDeposited(collectionId: recipient.collectionId, id: self.lastTokenId, metadata: metadataString, colorHex: colorHexString)

               // change the id so that each ID is unique
               self.lastTokenId = self.lastTokenId + 1

               count = count + 1


           }

           //return newPixel
       }

       //user mint
       // Function that uses the mint function but can be
       // publicly accessed and used to mint for payment
       pub fun userMintPixel(recipient: &AnyResource{PixelBlockCollectionInterfacer}, buyTokens: @FungibleToken.Vault, amount: UInt64, metadataString: String, colorHexString: String) {
           pre {
               (buyTokens.balance >= (UFix64(amount))) :
                   "Not enough tokens to buy the Pixels!"
           }

           let vaultRef = self.ownerVault.borrow()
               ?? panic("Could not borrow reference to owner token vault")

           // deposit the purchasing tokens into the owners vault
           vaultRef.deposit(from: <-buyTokens)

           // deposit the NFT into the buyers collection
           self.mintNFT(recipient: recipient, amount: amount, metadataString: metadataString, colorHexString: colorHexString)

       }

   }

   /*
       Build all our events
   */
   //pixel minted
   //pub event PixelMinted(collectionId: UInt256, id: UInt256, metadata: String, colorHex: String)

   //pixel color/metadata edited
   pub event PixelEdited(id: UInt256, metadata: String, colorHex: String)

   //pixel transferred
   pub event PixelWithdrawn(collectionId: UInt256, id: UInt256)
   //pub event PixelDeposited(collectionId: UInt256, id: UInt256)
   pub event PixelDeposited(collectionId: UInt256, id: UInt256, metadata: String, colorHex: String)

   //pixel destroyed
   pub event PixelDestroyed(id: UInt256)

   /*
       Main contract section
   */

   // Declare Path constants so paths do not have to be hardcoded
   // in transactions and scripts
   pub let CollectionMinterStoragePath: StoragePath
   pub let CollectionMinterPublicPath: PublicPath
   pub let PixelCollectionStoragePath: StoragePath
   pub let PixelCollectionPublicPath: PublicPath
   pub let MinterStoragePath: StoragePath
   pub let MinterPublicPath: PublicPath
   //pub let PixelMapStoragePath: StoragePath
   //pub let PixelMapPublicPath: PublicPath

   pub var ownerVault: Capability<&AnyResource{FungibleToken.Receiver}>

   // The init() function is required if the contract contains any fields.
   init() {
       // use unique path names
       self.CollectionMinterStoragePath = /storage/flowBankCollectionMinter
       self.CollectionMinterPublicPath = /public/flowBankCollectionMinter
       self.PixelCollectionStoragePath = /storage/flowBankCollection
       self.PixelCollectionPublicPath = /public/flowBankCollection
       self.MinterStoragePath = /storage/flowBankMinter
       self.MinterPublicPath = /public/flowBankMinter
       //self.PixelMapStoragePath = /storage/flowBankPixelMap
       //self.PixelMapPublicPath = /public/flowBankPixelMap

       //link the vault of whoever deploys the contract as owner to be paid to
       self.ownerVault = self.account.getCapability<&{FungibleToken.Receiver}>(/public/MainReceiver)

       //store a CollectionMinter then give public access link
       self.account.save(<-create PixelBlockCollectionMinter(), to:self.CollectionMinterStoragePath)
       self.account.link<&{PixelBlockCollectionMinterInterfacer}>(self.CollectionMinterPublicPath, target: self.CollectionMinterStoragePath)

       // store an empty Collection in contract deployer account storage and link to the Collection in storage
       let collectionMinter = self.account.getCapability<&{PixelBlockCollectionMinterInterfacer}>(self.CollectionMinterPublicPath)
           .borrow() ??
               panic("Could not get Collection Minter")
       //let collectionMinter = self.account.borrow<&{PixelBlockCollectionMinterInterfacer}>(from: self.CollectionMinterStoragePath)
           //??
               //panic("Could not get Collection Minter")
       self.account.save(<-create collectionMinter.createEmptyPixelBlock(), to: self.PixelCollectionStoragePath)
       self.account.link<&{PixelBlockCollectionInterfacer}>(self.PixelCollectionPublicPath, target: self.PixelCollectionStoragePath)

       // store a minter resource in account storage and link to the User available Minter in storage
       self.account.save(<-create PixelMinter(initVault: self.ownerVault), to: self.MinterStoragePath)
       self.account.link<&{UserPixelMinter}>(self.MinterPublicPath, target: self.MinterStoragePath)

       //store and link to the PixelMap
       //self.account.save(<-create PixelMap(), to: self.PixelMapStoragePath)
       //self.account.link<&{UserPixelMap}>(self.PixelMapPublicPath, target: self.PixelMapStoragePath)
   }
}
