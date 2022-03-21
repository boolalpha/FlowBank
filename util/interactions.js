// export const urlBase = 'http://0.0.0.0:3000';
// export const urlBase = 'http://localhost';
export const urlBase = '';
// export const urlBase = 'https://onflowbank.com';

/*Database calls used to get info about the pixels and owners*/
export const getAmountMinted = async (axios) => {
    var response = await axios({
        method: 'post',
        url: urlBase + '/api/dB/getAmountMinted'
    });

    if((response.status === 200)) {
        return response.data.msg[0]['amountMinted'];
    } else {
        console.error(response);
    }
}

export const getAmountOwners = async (axios) => {
    var response = await axios({
        method: 'post',
        url: urlBase + '/api/dB/getAmountOwners'
    });

    if((response.status === 200)) {
        if(response.data.msg[0]['amountOwners'] === undefined) {
            return 0;
        }
        return response.data.msg[0]['amountOwners'];
    } else {
        console.error(response);
    }
}

export const getUserCollectionId = async (fcl, userAddress) => {
    const transaction = await fcl.query({
        cadence: `
        // Setup Account

        //import FlowBank from 0xDevWallet
        import FlowBank from 0xDevWallet
        //import FungibleToken from 0x02

        // This transaction configures a user's account
        // to use the NFT contract by creating a new empty collection,
        // storing it in their account storage, and publishing a capability
        pub fun main(addr: Address): UInt256 {

            // store an empty Collection in contract deployer account storage and link to the Collection in storage
            let collection = getAccount(addr).getCapability<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath)
                .borrow() ??
                    panic("Could not get Collection from account")

            return collection.collectionId

        }

        `,
        args: (arg, t) => [arg(userAddress, t.Address)]
    });

    return transaction;

}

export const checkUserHasCollection = async (fcl, userAddress) => {
    const transaction = await fcl.query({
        cadence: `

            import FlowBank from 0xDevWallet

            pub fun main(addr: Address): Bool {
                if(getAccount(addr).getCapability<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath)
                    .borrow() != nil){
                        return true
                } else {
                    return false
                }
            }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)]
    });

    return transaction;
}

export const checkUserHasVault = async (fcl, userAddress) => {
    const transaction = await fcl.query({
        cadence: `

            import FungibleToken from 0xFungibleToken

            pub fun main(addr: Address): Bool {
                if(getAccount(addr).getCapability<&{FungibleToken.Receiver}>(/public/MainReceiver)
                    .borrow() != nil){
                        return true
                } else {
                    return false
                }
            }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)]
    });

    return transaction;
}

/*
    For getitng all the Pixels and returning in desired structure
*/
export const getAllPixels = async (axios) => {
    var response = await axios({
        method: 'post',
        url: urlBase + '/api/dB/getAllPixels'
    });

    if((response.status == 200)) {
        var tempObj = {};

        var pixels = response.data.msg;

        for(var i = 0; i < pixels.length; i++) {
            var pixelObject = {
                'id': pixels[i].id,
                'colorHex': pixels[i].color_hex,
                'ipfsHttp': pixels[i].metadata_string
            };

            if(pixels[i].collection_id in tempObj) {
                //create pixel list and add new
                tempObj[pixels[i].collection_id].push(pixelObject);
            } else {
                //add pixel to existing
                tempObj[pixels[i].collection_id] = [pixelObject];
            }
        }

        var pixelMapArray = [];
        for (let [key, value] of Object.entries(tempObj)) {
            pixelMapArray.push({"owner": key, "pixels": value});
        }

        //need to sort the array of objects
        pixelMapArray.sort((a, b) => {
            return ((a["pixels"].length - b["pixels"].length) * (-1));  //this returns a before b if positive so we multiply by -1 to get descending
        });

        return pixelMapArray;

    } else {
        console.error(response);
    }
}

/*
    mint transaction call to contract
*/
export const mintTransaction = async (fcl, mintAmount, colorHexString, ipfsString) => {
    // console.log(mintAmount.toString()+".0");
    // console.log(mintAmount);
    // console.log(colorHexString);
    // console.log(ipfsString);

    return fcl.mutate({
        cadence: `

            import FlowBank from 0xDevWallet
            import FungibleToken from 0xFungibleToken
            import FlowToken from 0xFlowToken

            // This transaction allows the Minter account to mint an NFT
            // and deposit it into its collection.

            transaction(
                transactionAmount: UFix64,
                mintAmount: UInt64,
                colorHexString: String,
                ipfsString: String
            ) {

                // The reference to the collection that will be receiving the NFT
                let receiverRef: &{FlowBank.PixelBlockCollectionInterfacer}

                // The reference to the Minter resource stored in account storage
                let minterRef: &{FlowBank.UserPixelMinter}

                // Vault that will hold the tokens that will be used to
                // buy the NFT
                let temporaryVault: @FungibleToken.Vault

                prepare(acct: AuthAccount) {
                    // Get the owner's collection capability and borrow a reference
                    self.receiverRef = acct.getCapability<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath)
                        .borrow()
                        ?? panic("Could not borrow receiver reference")

                    // Borrow a capability for the NFTMinter in storage
                    self.minterRef = getAccount(0xDevWallet).getCapability<&{FlowBank.UserPixelMinter}>(FlowBank.MinterPublicPath)
                        .borrow()
                        ?? panic("could not borrow minter reference")

                    let vaultRef = acct.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                        ?? panic("Could not borrow user's Flow Token vault reference")

                    // withdraw tokens from the buyers Vault
                    self.temporaryVault <- vaultRef.withdraw(amount: transactionAmount)
                }

                execute {
                    // Use the minter reference to mint an NFT, which deposits
                    // the NFT into the collection that is sent as a parameter.
                    //let newNFT = self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault)
                    //self.receiverRef.deposit(token: newNFT)
                    self.minterRef.userMintPixel(recipient: self.receiverRef, buyTokens:  <-self.temporaryVault, amount: mintAmount, metadataString: ipfsString, colorHexString: colorHexString)
                    log("NFT Minted by User and deposited to Account's Collection")

                }
            }
        `,
        args: (arg, t) => [
            arg(mintAmount.toString() + ".0", t.UFix64),
            arg(mintAmount, t.UInt64),
            arg(colorHexString.toString(), t.String),
            arg(ipfsString.toString(), t.String)
        ],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 100 * mintAmount
    });
}

export const editTransaction = async (fcl, idList, colorHexList, ipfsList) => {

    // console.log(idList);
    // console.log(colorHexList);
    // console.log(ipfsList);

    return fcl.mutate({
        cadence: `

            import FlowBank from 0xDevWallet
            //import FungibleToken from 0xFungibleToken
            //import FlowToken from 0xFlowToken

            transaction(idList: [UInt256], colorHexList: [String], ipfsList: [String]) {

                let receiverRef: &FlowBank.PixelBlockCollection

                prepare(acct: AuthAccount) {
                    pre {
                        (
                            (idList.length == colorHexList.length)
                            &&
                            (colorHexList.length == ipfsList.length)
                        ) :
                            "There was a mismatch in length between the IDList, IPFSList, and ColorHexList length"
                    }

                    self.receiverRef = acct.borrow<&FlowBank.PixelBlockCollection>(from: FlowBank.PixelCollectionStoragePath)
                        ?? panic("Could not borrow PixelBlockCollection reference - be sure you are the owner and your wallet is set up")

                    log(self.receiverRef.getCollectionPixelsInfo())

                }

                execute {
                    var index: UInt256 = 0
                    var length: UInt256 = UInt256(idList.length)
                    while (index < length) {
                        //change the given id pixel
                        self.receiverRef.ownedPixels[idList[index]]?.setPixelValues(metadata: ipfsList[index], colorHex: colorHexList[index])

                        index = index + 1 as UInt256
                    }

                    log(self.receiverRef.getCollectionPixelsInfo())
                }
            }

        `,
        args: (arg, t) => [
            arg(idList, t.Array(t.UInt256)),
            arg(colorHexList, t.Array(t.String)),
            arg(ipfsList, t.Array(t.String))
        ],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000 * idList.length
    });
}

export const transferTransaction = async (fcl, sendTo, idList) => {

    // console.log(sendTo);
    // console.log(idList);

    return fcl.mutate({
        cadence: `

            import FlowBank from 0xDevWallet
            //import FungibleToken from 0xFungibleToken
            //import FlowToken from 0xFlowToken

            // This transaction configures a user's account
            // to use the NFT contract by creating a new empty collection,
            // storing it in their account storage, and publishing a capability
            transaction(sendTo: Address, idList: [UInt256]) {
                let collection: &FlowBank.PixelBlockCollection
                let receiverRef: &{FlowBank.PixelBlockCollectionInterfacer}

                prepare(acct: AuthAccount) {
                    //get sender account to withdraw from
                    self.collection = acct.borrow<&FlowBank.PixelBlockCollection>(from: FlowBank.PixelCollectionStoragePath)
                        ?? panic("Could not borrow PixelBlockCollection reference - be sure you are the owner and your wallet is set up")

                    //get receiver from sendto address
                    self.receiverRef = getAccount(sendTo).getCapability<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath)
                        .borrow()
                        ?? panic("Could not borrow receiver reference")
                }

                execute {
                    //get our Pixels to transfer
                    var count = 0
                    while(count < idList.length) {
                        self.receiverRef.depositPixel(token: <- self.collection.withdrawPixel(id: idList[count]))
                        count = count + 1
                    }
                }
            }


        `,
        args: (arg, t) => [
            arg(sendTo, t.Address),
            arg(idList, t.Array(t.UInt256))
        ],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 100 * idList.length
    });
}

export const setUpVault = async (fcl) => {
    const transactionId = await fcl.mutate({
        cadence: `
        // Setup Account
        import FlowToken from 0xFlowToken
        import FungibleToken from 0xFungibleToken

        // This transaction configures a user's account
        // to use the NFT contract by creating a new empty collection,
        // storing it in their account storage, and publishing a capability
        transaction {
            prepare(acct: AuthAccount) {

                // create a new vault instance with an initial balance of 30
                let vaultA <- FlowToken.createEmptyVault()

                // Store the vault in the account storage
                acct.save<@FungibleToken.Vault>(<-vaultA, to: /storage/MainVault)

                // Create a public Receiver capability to the Vault
                let ReceiverRef = acct.link<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>(/public/MainReceiver, target: /storage/MainVault)

                log("Created a Vault and published a reference")
            }
        }
        `,
        args: (arg, t) => [],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 50
    });

    const transaction = await fcl.tx(transactionId).onceSealed();
    // console.log(transaction);
}

export const setUpCollection = async (fcl) => {
    const transactionId = await fcl.mutate({
        cadence: `
            // Setup Account


            import FlowBank from 0xDevWallet
            //import FungibleToken from 0x02

            // This transaction configures a user's account
            // to use the NFT contract by creating a new empty collection,
            // storing it in their account storage, and publishing a capability
            transaction {
                prepare(acct: AuthAccount) {

                    // store an empty Collection in contract deployer account storage and link to the Collection in storage
                    let collectionMinter = getAccount(0xDevWallet).getCapability<&{FlowBank.PixelBlockCollectionMinterInterfacer}>(FlowBank.CollectionMinterPublicPath)
                        .borrow() ??
                            panic("Could not get Collection Minter")

                    // Create a new empty collection
                    //let collection <- FlowBank.createEmptyPixelBlock()
                    let collection <- collectionMinter.createEmptyPixelBlock()

                    // store the empty NFT Collection in account storage
                    acct.save<@FlowBank.PixelBlockCollection>(<-collection, to: FlowBank.PixelCollectionStoragePath)
                    log("FlowBank PixelCollection created for account!")

                    // create a public capability for the Collection
                    acct.link<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath, target: FlowBank.PixelCollectionStoragePath)
                    log("Public facing capabilities linked for FlowBank PixelCollection")

                }
            }
        `,
        args: (arg, t) => [],
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 100
    });

    const transaction = await fcl.tx(transactionId).onceSealed();
    // console.log(transaction);
}
