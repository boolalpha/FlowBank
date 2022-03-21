const NEXT_PUBLIC_PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const NEXT_PUBLIC_PINATA_API_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_API_SECRET_KEY;

import https from "https";
import fs from "fs";
import pinataSDK from "@pinata/sdk";

export default async function handler(req, res) {
    // res.status(200).json({ success: true, msg: req.body });
    if (req.method === "POST") {
        if(req.body.functionname === "pinFile") {
            var colorHexList = req.body.arguments;
            var ipfsList = [];

            try {
                const pinata = pinataSDK(NEXT_PUBLIC_PINATA_API_KEY, NEXT_PUBLIC_PINATA_API_SECRET_KEY);
                for(var i = 0; i < colorHexList.length; i++) {
                    // //build body of json
                    const body = {
                        "image": "https://gateway.pinata.cloud/ipfs/QmTkWMMUvmwvuo5iTnHu23uvernvdSVUfcgzsiU3MrWmSm",
                        "background_color": colorHexList[i]
                    };
                    const options = {
                        pinataMetadata: {
                            name: "FlowBankMetadata"
                        },
                        pinataOptions: {
                            cidVersion: 0
                        }
                    };


                    await pinata.pinJSONToIPFS(body, options).then((result) => {
                        //handle results here
                        ipfsList.push("https://gateway.pinata.cloud/ipfs/" + result["IpfsHash"]);

                    }).catch((err) => {
                        //handle error here
                        res.status(500).json({ success: false, msg: err });
                    });
                }

                res.status(200).json({ success: true, msg: ipfsList });

            } catch (e) {
                res.status(500).json({ success: false, msg: e });
            }
        }
    }
}
