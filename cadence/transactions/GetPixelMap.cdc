// This script reads the total supply field
// of the FlowToken smart contract

import BillyBlocks from 0xf8d6e0586b0a20c7

pub fun main(): {Address: [AnyStruct]} {

    let pixelMap = BillyBlocks.pixelMap.pixelDict

    return pixelMap
}
