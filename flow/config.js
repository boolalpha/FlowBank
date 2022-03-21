import { config } from "@onflow/fcl";

config({
  // "accessNode.api": "http://localhost:8080", // Mainnet: "https://access-mainnet-beta.onflow.org"
  "accessNode.api": "https://access-testnet.onflow.org",
  // "discovery.wallet": "http://localhost:8701/fcl/authn", // Mainnet: "https://fcl-discovery.onflow.org/authn"
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  // "0xFungibleToken": "0xee82856bf20e2aa6",
  "0xFungibleToken": "0x9a0766d93b6608b7",
  // "0xFlowToken": "0x0ae53cb6e3f42a79",
  "0xFlowToken": "0x7e60df042a9c0868",
  // "0xDevWallet": "0xf8d6e0586b0a20c7"
  "0xDevWallet": "0x9ad71b01a6b48352"
})

// import * as fcl from "@onflow/fcl"
//
// fcl.config()
//   // Point App at Emulator
//   .put("accessNode.api", "http://localhost:8080")
//   // Point FCL at dev-wallet (default port)
//   .put("discovery.wallet", "http://localhost:8701/fcl/authn")
