// Setup Account
import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

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
