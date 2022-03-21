import Head from 'next/head';
import "../flow/config";
import { useState, useEffect, useRef, memo } from "react";
import * as fcl from "@onflow/fcl";
import * as sdk from "@onflow/sdk";

import { MapInteraction } from 'react-map-interaction';

import {
    urlBase,
    getAmountMinted,
    getAmountOwners,
    getUserCollectionId,
    checkUserHasCollection,
    checkUserHasVault,
    getAllPixels,
    mintTransaction,
    editTransaction,
    transferTransaction,
    setUpCollection,
    setUpVault
} from "../util/interactions.js";

export default function Home() {

    const axios = require('axios').default;

    //state hook variables
    const [user, setUser] = useState({loggedIn: null});
    const [events, setEvents] = useState({});
    // const [name, setName] = useState('');

    const [userHasCollection, setUserHasCollection] = useState(false);
    const [userHasVault, setUserHasVault] = useState(false);

    const [pixelMap, setPixelMap] = useState(); //this is the main pixel map for all the banks

    const [blockViewer, setBlockViewer] = useState();   //this shows specific coin blocks
    const [stateGlobalPixelMap, setStateGlobalPixelMap] = useState([]);
    var globalPixelMap = [];

    const [displayMint, setDisplayMint] = useState(false);
    const [displayEdit, setDisplayEdit] = useState(false);
    const [displayTransfer, setDisplayTransfer] = useState(false);
    const [displayInfo, setDisplayInfo] = useState(false);

    const [amountMinted, setAmountMinted] = useState("Not connected to the Flow network."); //default message
    const [amountOwners, setAmountOwners] = useState("Not connected to the Flow network."); //default message

    const [displayInfoPixelId, setDisplayInfoPixelId] = useState("n/a");
    const [displayInfoPixelColorHex, setDisplayInfoPixelColorHex] = useState("none");
    const [displayInfoAddress, setDisplayInfoAddress] = useState("No address set");

    //References
    const svgRef = useRef(null);

    //global variable
    var mainZoom = 1;
    var blockViewerZoom = 1;

    useEffect(async () => {
        await fcl.currentUser.subscribe(setUser);

        // SUBSCRIBING TO EVENTS IN FLOW DOES NOT WORK BUT WOULD BE GREAT UTILITY
        // in some react component
        // fcl.events("PixelDeposited").subscribe((event) => {
        //     console.log(event)
        // });
        // fcl.events("PixelEdited").subscribe((event) => {
        //     console.log(event)
        // });

        buildGlobalPixelMap();

        var userCollectionId = localStorage.getItem("userCollectionId");
        if(userCollectionId !== null) {
            setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: globalPixelMap}));
        }


    }, []);

    async function buildGlobalPixelMap() {
        //build out the header info
        const currentAmountMinted = await getAmountMinted(axios);
        setAmountMinted(currentAmountMinted);
        const currentAmountOwners = await getAmountOwners(axios);
        setAmountOwners(currentAmountOwners);

        //for building the pages block viewer
        // globalPixelMap = loadFakePixelMap();
        globalPixelMap = await getAllPixels(axios);
        // console.log(globalPixelMap);
        setStateGlobalPixelMap(globalPixelMap);
        setPixelMap(PixelMap({currentPixelMap:globalPixelMap}));
        draw(svgRef.current, globalPixelMap);
    }

    /* Fake pixel block builder used for testing purposes */
    function loadFakePixelMap() {
        var returnMap = {};

        var numOwners = 10;
        var pixelId = 0;

        for(var i = 0; i < numOwners; i++) {
            // var fakeOwnerAddress = "0x" + i;
            var fakeOwnerAddress = i;
            // var ownerObj = {"owner": fakeOwnerAddress, "pixels": }
            // var ownerPixelList = [];

            //create random num of pixels
            var numPixels = parseInt(Math.random() * (10000 - 1) + 1);
            // var numPixels = 10000;
            // var randomColor = (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');

            for(var j = 0; j < numPixels; j++) {
                var randomColor = (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
                var pixelObject = {
                    'id': pixelId,
                    'colorHex': randomColor,
                    'ipfsHttp': "https://gateway.pinata.cloud/ipfs/Qmdh3PoS617GhBz4gEea7uQQVteAY21i34x4bDKzMqdhrz"
                };
                pixelId++;

                if(fakeOwnerAddress in returnMap) {
                    //create pixel list and add new
                    returnMap[fakeOwnerAddress].push(pixelObject);
                } else {
                    //add pixel to existing
                    returnMap[fakeOwnerAddress] = [pixelObject];
                }
            }
        }

        var pixelMapArray = [];
        for (let [key, value] of Object.entries(returnMap)) {
            pixelMapArray.push({"owner": key, "pixels": value});
        }

        //need to sort the array of objects
        pixelMapArray.sort((a, b) => {
            return ((a["pixels"].length - b["pixels"].length) * (-1));  //this returns a before b if positive so we multiply by -1 to get descending
        });

        return pixelMapArray;
    }

    /* Functions for updating active button */
    function setActiveButton() {
        var activePage = null;
        var pages = document.getElementsByClassName("displayControllerContainer");
        for (var i = 0; i < pages.length; i++) {
            if(pages[i].classList.contains("activeDisplayController")){
                activePage = i;
            }
        }

        var currentActive = document.getElementById("activePage");
        if((currentActive !== null) && (currentActive !== undefined)) {
            currentActive.id="";
        }
        var contractButtons = document.getElementsByClassName("contractButton");
        if(contractButtons.length > 1) {
            if(!document.getElementById("pagesContainer").classList.contains("openPages")){
                contractButtons[2].id = "activePage";
            } else {
                switch(activePage) {
                    case 0:
                        contractButtons[0].id = "activePage";
                        break;
                    case 1:
                        contractButtons[1].id = "activePage";
                        break;
                    case 2:
                        contractButtons[3].id = "activePage";
                        break;
                    case 3:
                        contractButtons[4].id = "activePage";
                        break;
                    default:
                        // contractButtons[2].id = "activePage";
                        break;
                }
            }

        } else {
            contractButtons[0].id = "activePage";
        }
    }

    /*Functions below are un documented*/

    // const getBalance = async () => {
    //     const smartContract = await fcl.query({
    //         cadence: `
    //         // This script reads the total supply field
    //         // of the FlowToken smart contract
    //
    //         import FlowToken from 0xFlowToken
    //
    //         pub fun main(): UFix64 {
    //
    //             let supply = FlowToken.totalSupply
    //
    //             return supply
    //         }
    //         `
    //     });
    //
    //     // setName(smartContract?.name ?? 'No Profile')
    //     // console.log(smartContract);
    // }

    // const getAccountBalance = async () => {
    //     const transaction = await fcl.query({
    //         cadence: `
    //         // This script reads the balance field of an account's FlowToken Balance
    //
    //         import FungibleToken from 0xFungibleToken
    //         import FlowToken from 0xFlowToken
    //
    //         pub fun main(account: Address): UFix64 {
    //
    //             let vaultRef = getAccount(account)
    //             .getCapability(/public/flowTokenBalance)
    //             .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
    //             ?? panic("Could not borrow Balance reference to the Vault")
    //
    //             return vaultRef.balance
    //         }
    //         `,
    //         args: (arg, t) => [arg(user.addr, t.Address)]
    //     });
    //
    //     // console.log(transaction);
    //
    // }

    /* getLastEventBlockHeight is used to get each events last recorded height(id) in the database */
    // const getLastEventBlockHeight = async (eventName) => {
    //     var blockHeight = await axios({
    //         method: 'post',
    //         url: urlBase + '/php/index.php',
    //         headers: { 'content-type': 'application/json' },
    //         data: {
    //             functionname: 'getLastEventBlockHeight',
    //             arguments: [eventName]
    //         }
    //     })
    //
    //     if(blockHeight.status == 200) {
    //         if("result" in blockHeight.data) {
    //             var result = blockHeight.data["result"];
    //             //if we do not find a result for the event; we insert the event into the table and return 0
    //             if(result.length == 0){
    //                 const insertEventBlockHeight = await axios({
    //                     method: 'post',
    //                     url: urlBase + '/php/index.php',
    //                     headers: { 'content-type': 'application/json' },
    //                     data: {
    //                         functionname: 'insertEvent',
    //                         arguments: [eventName]
    //                     }
    //                 })
    //
    //                 if(insertEventBlockHeight.status == 200) {
    //                     console.debug("Inserted Event Block Height");
    //                     return 0;
    //                 } else {
    //                     console.error(insertEventBlockHeight);
    //                 }
    //
    //             } else {
    //                 //return the block height stored in the dB for the event
    //                 return result[0].lastBlockHeight;
    //             }
    //         } else if("error" in blockHeight.data) {
    //             console.error(blockHeight.data['error']);
    //         }
    //     } else {
    //         console.error(blockHeight);
    //     }
    //
    //     return blockHeight;
    // }

    /* getEvents uses flow sdk to retrive events that have occured */
    const getEvents = async (params) => {
        // Define event type from params
        const { contractAddress, contractName, eventName } = params;
        const eventType = `A.${contractAddress}.${contractName}.${eventName}`;

        const { from = 0 } = params;

        from = parseInt(from);
        // console.log(from);

        const blockResponse = await fcl.send(sdk.build([sdk.getBlock(false)]));
        // console.log( blockResponse.block.height);

        var events = [];

        while (from < blockResponse.block.height) {
            var toBlockHeight = (blockResponse.block.height - 249 > from) ? from + 249 :  blockResponse.block.height;

            //console.log(from);
            //console.log(toBlockHeight);

            const response = await fcl.send(
                await sdk.build([
                    sdk.getEventsAtBlockHeightRange(eventType, from, toBlockHeight)
                ])
            );

            // console.log(response.events);

            events.push(response.events);

            from += 249;

            //break;
        }

        // console.log(events);

        // Return a list of events
        return events;
    };

    /* updatePixelsDeposited corresponds to pixel minted event and will insert new events into dB */
    const updatePixelsDeposited = async (pixelRows) => {
        // const eventName = "PixelDeposited";
        //
        // //get the last Block Height of PixelMinted event
        // const blockHeight = await getLastEventBlockHeight(eventName);
        //
        // const events = await getEvents({
        //     contractName: "FlowBank",
        //     // contractName: "BillyBlocks",
        //     contractAddress: "f8d6e0586b0a20c7", // note the address is without "0x" prefix
        //     // contractAddress: "9ad71b01a6b48352", // note the address is without "0x" prefix
        //     eventName: eventName,
        //     from: blockHeight
        // });
        //
        // //build our pixels array
        // var finalBlockHeight = 0;
        // var pixelRows = [];
        // for (var i = 0; i < events.length; i++) {
        //     if(events[i].blockHeight > finalBlockHeight) {
        //         finalBlockHeight = events[i].blockHeight;
        //     }
        //
        //     var values = events[i].payload.value.fields;
        //
        //     const collectionId = values[0].value.value;
        //     const id = values[1].value.value;
        //     const metadataString = values[2].value.value;
        //     const hexColor = values[3].value.value;
        //
        //     pixelRows.push([id, collectionId, hexColor, metadataString]);
        // }

        // console.log(pixelRows);

        //insert all pixel into dB
        const insertPixels = await axios({
            method: 'post',
            url: urlBase + '/api/dB/insertPixels',
            data: {
                arguments: [pixelRows]
            }
        });
        // console.log(insertPixels);

        // if((insertPixels.status == 200) && (!("error" in insertPixels.data))) {
        //     //update our dB keeping track of last blockHeights
        //     const updateEventBlockHeight = await axios({
        //         method: 'post',
        //         url: 'http://localhost/php/index.php',
        //         headers: { 'content-type': 'application/json' },
        //         data: {
        //             functionname: 'updateEventBlockHeight',
        //             arguments: [eventName, finalBlockHeight]
        //         }
        //     });
        //     // console.log(updateEventBlockHeight);
        // }
    }


    const updatePixelsEdited = async (pixelRows) => {
        // const eventName = "PixelEdited";
        //
        // //get the last Block Height of PixelMinted event
        // const blockHeight = await getLastEventBlockHeight(eventName);
        //
        // const events = await getEvents({
        //     contractName: "FlowBank",
        //     // contractName: "BillyBlocks",
        //     contractAddress: "f8d6e0586b0a20c7", // note the address is without "0x" prefix
        //     // contractAddress: "9ad71b01a6b48352", // note the address is without "0x" prefix
        //     eventName: eventName,
        //     from: blockHeight
        // });
        //
        // console.log(events);
        //
        // //build our pixels array
        // var finalBlockHeight = 0;
        // var pixelRows = [];
        // for (var i = 0; i < events.length; i++) {
        //     if(events[i].blockHeight > finalBlockHeight) {
        //         finalBlockHeight = events[i].blockHeight;
        //     }
        //
        //     var values = events[i].payload.value.fields;
        //
        //     const id = values[0].value.value;
        //     const metadataString = values[1].value.value;
        //     const hexColor = values[2].value.value;
        //
        //     pixelRows.push([id, hexColor, metadataString]);
        // }

        // console.log(pixelRows);

        //edit all pixel in dB
        const editPixels = await axios({
            method: 'post',
            url: urlBase + '/api/dB/editPixels',
            data: {
                arguments: [pixelRows]
            }
        });
        // console.log(editPixels);

        // if((editPixels.status == 200) && (!("error" in editPixels.data))) {
        //     //update our dB keeping track of last blockHeights
        //     const updateEventBlockHeight = await axios({
        //         method: 'post',
        //         url: urlBase + '/php/index.php',
        //         headers: { 'content-type': 'application/json' },
        //         data: {
        //             functionname: 'updateEventBlockHeight',
        //             arguments: [eventName, finalBlockHeight]
        //         }
        //     });
        //     // console.log(updateEventBlockHeight);
        // }
    }

    // const setupAccount = async () => {
    //     console.log(user?.addr ?? "No Address");
    //
    //     const transactionId = await fcl.mutate({
    //         cadence: `
    //         // Setup Account
    //
    //         import FlowBank from 0xDevWallet
    //         // import BillyBlocks from 0xDevWallet
    //         //import FungibleToken from 0x02
    //
    //         // This transaction configures a user's account
    //         // to use the NFT contract by creating a new empty collection,
    //         // storing it in their account storage, and publishing a capability
    //         transaction {
    //             prepare(acct: AuthAccount) {
    //
    //                 // store an empty Collection in contract deployer account storage and link to the Collection in storage
    //                 let collectionMinter = getAccount(0xDevWallet).getCapability<&{FlowBank.PixelBlockCollectionMinterInterfacer}>(FlowBank.CollectionMinterPublicPath)
    //                     .borrow() ??
    //                         panic("Could not get Collection Minter")
    //
    //                 // Create a new empty collection
    //                 //let collection <- FlowBank.createEmptyPixelBlock()
    //                 let collection <- collectionMinter.createEmptyPixelBlock()
    //
    //                 // store the empty NFT Collection in account storage
    //                 acct.save<@FlowBank.PixelBlockCollection>(<-collection, to: FlowBank.PixelCollectionStoragePath)
    //                 log("FlowBank PixelCollection created for account!")
    //
    //                 // create a public capability for the Collection
    //                 acct.link<&{FlowBank.PixelBlockCollectionInterfacer}>(FlowBank.PixelCollectionPublicPath, target: FlowBank.PixelCollectionStoragePath)
    //                 log("Public facing capabilities linked for FlowBank PixelCollection")
    //
    //             }
    //         }
    //
    //
    //         `,
    //         args: (arg, t) => [],
    //         payer: fcl.authz,
    //         proposer: fcl.authz,
    //         authorizations: [fcl.authz],
    //         limit: 50
    //     });
    //
    //     const transaction = await fcl.tx(transactionId).onceSealed();
    //     console.log(transaction);
    // }

    /*
        Our login and logout functions used to connect to wallet
    */
    const logIn = async () => {

        const response = await fcl.logIn();

        if(response.addr !== null) {
            var collectionCheck = await checkUserHasCollection(fcl, response.addr);
            setUserHasCollection(collectionCheck);

            var vaultCheck = await checkUserHasVault(fcl, response.addr);
            setUserHasVault(vaultCheck);

            if(collectionCheck) {
                var userCollectionId = await getUserCollectionId(fcl, response.addr);
            } else {
                var userCollectionId = null;
            }

            localStorage.setItem("userCollectionId", userCollectionId);

            setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));

            setActiveButton();
        }
    }

    const logOut = () => {

        fcl.unauthenticate();
    }


    /*
        The following is the main pixel map display
    */
    const PixelMap = (props) => {

        var currentPixelMap = props.currentPixelMap;
        // console.log(currentPixelMap);
        // console.log(globalPixelMap);

        return (
            <div id="pixelMapDisplayContainer">
                <div className="redrawContainer">
                    <div
                        className="redrawIncrease"
                        onClick={() => {
                            mainZoom++;
                            draw(svgRef.current, currentPixelMap);
                        }}
                    >+</div>
                    <div
                        className="redrawDecrease"
                        onClick={() => {
                            if(mainZoom > 1) {
                                mainZoom--;
                                draw(svgRef.current, currentPixelMap);
                            }
                        }}
                    >-</div>
                </div>
                <MapInteraction onClick={(e)=>{e.stopPropagation(); e.preventDefault();}}>
                    {
                        ({ translation, scale }) => {
                            /* Use the passed values to scale content on your own. */
                            return (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        marginTop: "calc(125px + 2vmin)",
                                        transformOrigin: "0px 0px 0px",
                                        transform: "matrix("+scale+ ", 0, 0, " + scale + ", "+ translation.x + ", " + translation.y + ")"
                                    }}
                                >
                                    <svg
                                        ref={svgRef}
                                        height="100px" width="100px"
                                        xmlns="http://www.w3.org/2000/svg"
                                        id="mainPixelMapSvg"
                                    />
                                </div>
                            );
                        }
                    }
                </MapInteraction>
            </div>
        );
    }

    /* handles drawing the svg of the actual main pixel map */
    const draw = (svg, pixelMap) => {
        // console.log(pixelMap);
        // console.log(svg);
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        var isPortrait = (window.innerWidth < window.innerHeight);

        var NS = svg.getAttribute('xmlns');

        var pixelSize = mainZoom * 10;
        var gap = 10;

        var finalSizeLength = (pixelMap.length>0) ? Math.ceil(Math.sqrt(pixelMap[0].pixels.length)) : 100;

        var start = 0;

        for(var wallet = 0; wallet < pixelMap.length; wallet++) {

            var square = Math.ceil(Math.sqrt(pixelMap[wallet].pixels.length));

            // console.log(wallet);
            for(var pixel = 0; pixel < pixelMap[wallet].pixels.length; pixel++) {

                // console.log(Math.floor(wallet));

                var x = pixel%square;
                var y = Math.floor(pixel / square);
                // console.log(x);
                // console.log(y);
                // console.log(pixelMap[wallet].pixels[pixel].colorHex);

                var r = document.createElementNS(NS, 'rect');

                if(isPortrait) {
                    r.setAttribute("x", (x*pixelSize));
                    r.setAttribute("y", start+(y*pixelSize));
                } else {
                    r.setAttribute("x", start+(x*pixelSize));
                    r.setAttribute("y", (y*pixelSize));
                }

                r.setAttribute("width", pixelSize);
                r.setAttribute("height", pixelSize);
                r.setAttribute("rx", (pixelSize/2).toString()); //if we want the pixels to be circles
                r.setAttribute("fill", "#"+pixelMap[wallet].pixels[pixel].colorHex);

                r.pixelMap = pixelMap;
                r.owner = pixelMap[wallet].owner;

                r.style.cursor = "pointer";

                r.addEventListener('click', function(e) {
                    // e.stopPropagation();
                    var t = e.target;
                    // console.log(t.pixelMap);
                    setBlockViewer(BlockViewer({collectionId: t.owner, startSize: blockViewerZoom, currentPixelMap: t.pixelMap}));
                    setDisplayInfoAddress(t.owner);
                    activateInfoDisplay();
                });

                r.addEventListener('touchstart', function(e) {
                    // e.stopPropagation();
                    var t = e.target;
                    // console.log(t.pixelMap);
                    setBlockViewer(BlockViewer({collectionId: t.owner, startSize: blockViewerZoom, currentPixelMap: t.pixelMap}));
                    setDisplayInfoAddress(t.owner);
                    activateInfoDisplay();
                });

                svg.appendChild(r);
            }

            start += (square * pixelSize) + gap;

        }

        if(isPortrait) {
            svg.setAttribute("height", start + "px");
            svg.setAttribute("width", (finalSizeLength * pixelSize) + (gap * 2) + "px");
        } else {
            svg.setAttribute("width", start + "px");
            svg.setAttribute("height", (finalSizeLength * pixelSize) + (gap * 2) + "px");
        }

    }

    /*
        Pages component used to make any changes
        all subsequent functions relate
    */
    const Pages = () => {
        return (
            <div id="displayContainer">
                <Mint />
                <Edit />
                <Transfer />
                <Info />
            </div>
        );
    }

    /* Mint page and functions*/
    const Mint = () => {
        const [mintColor, setMintColor] = useState("#40e0d0");

        return (
            <div id="mintController" className={`displayControllerContainer ${displayMint ? 'activeDisplayController' : ''}`}>
                <div>Select the color of your new Coins</div>
                <div id="mintColorSelectInputWrapper" style={{backgroundColor: mintColor}}>
                    <input id="mintColorSelectInput" type="color" value={mintColor} onChange={(e) => {setMintColor(e.target.value);}}></input>
                </div>
                <div id="mintColorSelectHexText">
                    {mintColor}
                </div>
                <div id="mintAmountHeader">Amount to mint</div>
                <div id="mintAmountContainer">
                    <div id="mintAmountInputContainer">
                        <input id="mintAmountInput" type="number" defaultValue="1" step="1" min="1" onChange={verifyInput}/>
                        <div id="mintAmountButtonContainer">
                            <div id="mintAmountButtonIncrease" onClick={increaseMintAmount}>+</div>
                            <div id="mintAmountButtonDecrease" onClick={decreaseMintAmount}>-</div>
                        </div>
                    </div>
                </div>
                <div id="mintButton" onClick={mintPixels}>Mint Flow Coins</div>

            </div>
        );
    }

    function decreaseMintAmount() {
        //get current amount and make sure new val wont be negative
        var inputElem = document.getElementById("mintAmountInput");

        var curValue = parseInt(inputElem.value);
        var newValue = curValue - 1;

        if(newValue >= 1) {
            inputElem.value = newValue;
        } else {
            inputElem.value = 1;
        }
    }

    function increaseMintAmount() {
        //get current amount and make sure new val wont be negative
        var inputElem = document.getElementById("mintAmountInput");

        var curValue = parseInt(inputElem.value);
        var newValue = curValue + 1;

        if(newValue >= 1) {
            inputElem.value = newValue;
        } else {
            inputElem.value = 1;
        }
    }

    function verifyInput() {
        //get current amount and make sure new val wont be negative
        var inputElem = document.getElementById("mintAmountInput");

        if(inputElem.value !== "") { //this allows user to backspace to empty
            if(inputElem.value < 1) {
                inputElem.value = 1;
            }
        }
    }

    const mintPixels = async () => {
        // console.log(user?.addr ?? "No Address");

        showLoading();

        //get the amount, new color
        var amount = document.getElementById("mintAmountInput").value;
        // console.log(amount);
        //be sure we can process amount as a positive int
        amount = parseInt(amount);

        if(!(amount > 0)){
            console.error("ERROR: the amount entered to mint was not a positive number");
        } else {

            var colorHexString = document.getElementById("mintColorSelectInput").value.substring(1); //removes #
            // console.log(colorHexString);

            //send the call to our api to pin to pinata
            //get our returned hash file
            await axios({
                method: 'post',
                url: "./api/pinata/",
                headers: { 'content-type': 'application/json' },
                data: {
                    functionname: 'pinFile',
                    arguments: [colorHexString]
                }
            }).then(async function (response) {
                if(response.status === 200) {
                    var ipfsList = response.data.msg;

                    //pass all info on to our contract transaction function
                    mintTransaction(fcl, amount, colorHexString, ipfsList[0]).then(async function (transactionId) {
                        const transaction = await fcl.tx(transactionId).onceSealed();
                        // console.log(transaction);

                        var events = getEventsList(transaction.events);

                        // console.log(events);

                        //insert the pixel into the db from event updates
                        await updatePixelsDeposited(events);

                        //update the blockViewer and the main pixel map
                        await buildGlobalPixelMap();

                        closeLoading();
                        displayPopUpSuccess("Your Pixels have successfully been minted!");
                    });
                } else {
                    console.error(response);
                }
            });

        }
    }

    function getEventsList(events) {
        //const contractAddress = "f8d6e0586b0a20c7";
        const contractAddress = "9ad71b01a6b48352";

        var filterEventsList = [];

        for(var i = 0; i < events.length; i++) {
            if(events[i].type === "A." + contractAddress + ".FlowBank.PixelDeposited") {
                filterEventsList.push([
                    events[i].data.id,
                    events[i].data.collectionId,
                    events[i].data.colorHex,
                    events[i].data.metadata
                ]);
            } else if(events[i].type === "A." + contractAddress + ".FlowBank.PixelEdited") {
                filterEventsList.push([
                    events[i].data.id,
                    events[i].data.colorHex,
                    events[i].data.metadata
                ]);
            }
        }

        return filterEventsList;
    }

    const Edit = () => {
        const [editColor, setEditColor] = useState("#40e0d0");

        return (
            <div id="editController" className={`displayControllerContainer ${displayEdit ? 'activeDisplayController' : ''}`}>
                Select your Coin to change its color
                <div id="editColorSelectContainer">
                    <div id="editColorSelectInputWrapper" style={{backgroundColor: editColor}}>
                        <input id="editColorSelectInput" type="color" value={editColor} onChange={(e) => {setEditColor(e.target.value);}}></input>
                    </div>
                    <div id="editColorSelectHexText">
                        {editColor}
                    </div>
                </div>
                <div id="editChangesMadeContainer">
                    <div id="editChangesMadeTitle">Edited Coins List</div>
                    <div id="editChangesMadeHolder"></div>
                </div>
                <div id="editButton" onClick={editPixels}>Edit Flow Coins</div>
            </div>
        );
    }

    function addToEdit(clickEvent, pixel) {
        //get color input value
        var currentColorValue = document.getElementById("editColorSelectInput").value;

        //change pixel background color to input value
        clickEvent.target.style.backgroundColor = currentColorValue;

        //add pixel/new color to html holder
        var html = '';
        var htmlHolder = document.getElementById("editChangesMadeHolder");

        var pixelIndex = null;
        for(var i = 0; i < htmlHolder.children.length; i++) {
            if(htmlHolder.children[i].children[0].innerHTML === pixel.id) {
                pixelIndex = i;
                break;
            }
        }

        if(pixelIndex !== null) {
            htmlHolder.children[pixelIndex].style.backgroundColor = currentColorValue;
            htmlHolder.children[pixelIndex].children[1].innerHTML = currentColorValue;
        } else {
            html = `
                <div class="editPixel" style="background-color: ` + currentColorValue + `">
                    <div class="editPixelId">` + pixel.id + `</div>
                    <div class="editPixelHex">` + currentColorValue + `</div>
                    <div class="editPixelRemove" onclick="javascript:(function() {
                        var blockViewerPixels = document.getElementsByClassName('blockViewerPixel');
                        for(var i = 0; i < blockViewerPixels.length; i++) {
                            if(blockViewerPixels[i].innerHTML === '` + pixel.id + `') {
                                blockViewerPixels[i].style.backgroundColor = '#` + pixel.colorHex + `';
                            }
                        }
                    })();
                    this.parentNode.remove();
                    "><img src="/img/icons/trash.png" alt="trashImg" class="trashImg"></img></div>
                </div>
            `;
            htmlHolder.innerHTML += html;
        }

    }

    const rgb2hex = (rgb) => `${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;

    const editPixels = async () => {
        showLoading();

        //list of ids, list of color hex, list of new ipfs which will have to be created in pinata from interactions
        var innerEditElements = document.getElementById("editChangesMadeHolder").children;

        // //if nothing in list show pop up
        if(innerEditElements.length === 0) {
            displayPopUpMessage("You have no Pixels in your Edit list!");
            console.log("YOU HAVE NO PIXELS IN EDIT LIST");
        } else {

            var idList = [];
            var colorHexList = [];
            var newIpfsList = [];
            //get list of edits to make
            for(var i = 0; i < innerEditElements.length; i++) {
                colorHexList.push(rgb2hex(innerEditElements[i].style.backgroundColor));
                idList.push(parseInt(innerEditElements[i].children[0].innerText));
            }

            // console.log(idList);
            // console.log(colorHexList);

            //send the call to our api to pin to pinata
            //get our returned hash file
            await axios({
                method: 'post',
                url: "./api/pinata/",
                headers: { 'content-type': 'application/json' },
                data: {
                    functionname: 'pinFile',
                    arguments: colorHexList
                }
            }).then(async function (response) {
                if(response.status === 200) {
                    var ipfsList = response.data.msg;
                    // check that we havent errored from pinata
                    if(!Array.isArray(ipfsList)) {
                        //show error pop up
                        //displayPopUpMessage("Something has gone wrong and we recieved an Error. Don't worry your transaction has not processed. Please try again, and if the problem persists contact support.")
                        console.error("ipfsList from pinata returned with an issue - null");
                    } else {
                        // console.log(ipfsList);

                        //send to imported contract function
                        editTransaction(fcl, idList, colorHexList, ipfsList).then(async function (transactionId) {
                            // console.log(transactionId);
                            const transaction = await fcl.tx(transactionId).onceSealed();
                            // console.log(transaction);

                            var events = getEventsList(transaction.events);

                            //insert the pixel into the db from event updates
                            await updatePixelsEdited(events);

                            //update block viewer and pixel map
                            await buildGlobalPixelMap();

                            closeLoading();
                            displayPopUpSuccess("Successfully edited colors!");
                        });
                    }
                }
            });
        }
    }

    const Transfer = () => {
        return (
            <div id="transferController" className={`displayControllerContainer ${displayTransfer ? 'activeDisplayController' : ''}`}>
                <div id="transferSelectBillyContainer">
                    Select the Coins you would like to transfer
                    <div id="transferBillyHolder"></div>
                </div>
                <div id="transferAddressContainer">
                    <div>Enter the address to transfer the Coins to</div>
                    <input id="transferAddressInput" type="text" placeholder="Address To Transfer To" />
                </div>
                <div id="transferCheckContainer">
                    <input type="checkbox" id="transferConsent"/>
                    <label id="transferConsentLabel" htmlFor="transferConsent"> Yes, I understand all the implications of sending away my Coins!</label>
                </div>
                <div id="transferButton" onClick={transferPixels}>Transfer Flow Coins</div>
            </div>
        );
    }

    function addToTransfer(pixel)  {
        var htmlHolder = document.getElementById("transferBillyHolder");
        // console.log(htmlHolder.children);

        var pixelInArray = false;
        for(var i = 0; i < htmlHolder.children.length; i++) {
            if(htmlHolder.children[i].children[0].innerHTML === pixel.id) {
                pixelInArray = true;
                break;
            }
        }

        if(pixelInArray !== true) {
            var html = `
                <div class="transferPixel" style="background-color: #` + pixel.colorHex + `">
                    <div class="transferPixelId">` + pixel.id + `</div>
                    <div class="transferPixelHex">#` + pixel.colorHex + `</div>
                    <div class="transferPixelRemove" onclick="this.parentNode.remove();"><img src="/img/icons/trash.png" class="trashImg" alt="trashImg"></div>
                </div>
            `;

            // console.log(html);

            htmlHolder.innerHTML += html;
        }
    }

    const transferPixels = async () => {
        var htmlHolder = document.getElementById("transferBillyHolder");
        var idToTransfer = [];
        //create array of id
        var idAreValid = true;
        for(var i = 0; i < htmlHolder.children.length; i++) {
            var id = parseInt(htmlHolder.children[i].children[0].innerHTML);
            //check that all interior are numbers (no tampering)
            if(isNaN(id)){
                console.error("There is something wrong with a given ID. Cannot be converted to a number.");
                idAreValid = false;
                // throw 'Error in IDs';
                //displayPopUpMessage("There is something wrong with a given Transfer Billy ID. Cannot be converted to a number. Please contact support if you believe this is in error.");
            } else {
                //push to array
                idToTransfer.push(id);
            }
        }

        if(idAreValid) {
            // console.log(idToTransfer);

            if(idToTransfer.length <= 0 ) {
                displayPopUpMessage("There are no Pixels in your Transfer List!");
                console.log("There are no Pixels in your Transfer List!");
            } else {

                var addressToTransferTo = document.getElementById("transferAddressInput").value;

                if(addressToTransferTo.length > 0) {

                    // console.log(addressToTransferTo);

                    var confirmCheck = document.getElementById("transferConsent").checked;

                    //user has confirmed checked
                    if(confirmCheck) {
                        showLoading();
                        // console.log(confirmCheck);

                        transferTransaction(fcl, addressToTransferTo, idToTransfer).then(async function (transactionId) {
                            const transaction = await fcl.tx(transactionId).onceSealed();
                            // console.log(transaction);

                            var events = getEventsList(transaction.events);

                            //insert the pixel into the db from event updates
                            await updatePixelsDeposited(events);

                            //update block viewer and pixel map
                            await buildGlobalPixelMap();

                            closeLoading();
                            displayPopUpSuccess("Successfully transfered Pixel!");
                        });
                    } else {
                        console.log("You must check/confirm that you want to make this transfer.");
                        displayPopUpMessage("You must click the checkbox to confirm that you want to make this transfer, that the Transfer Address is correct, and that you understand that transfering these Pixels relinquishes your ownership.");
                    }
                } else {
                    console.log("You cannot leave the Address blank.");
                    displayPopUpMessage("You cannot leave the Transfer Address blank. Be sure you are entering the correct address you want to tranfer to.");
                }
            }
        }

    }

    const Info = () => {
        var rank = stateGlobalPixelMap.findIndex(wallet => parseInt(wallet.owner) === parseInt(displayInfoAddress)) + 1;
        if (rank === 0) {
            rank = "None";
        }

        return (
            <div id="infoController" className={`displayControllerContainer ${displayInfo ? 'activeDisplayController' : ''}`}>
                <div id="pixelInfoContainer">Click pixel to get info
                    <div id="pixelInfoDisplayContainer">Pixel Info:
                        <div id="pixelInfoDisplayContent">
                            <div className="pixelInfoHolder">
                                <div className="pixelInfoHolderHeader">ID:</div>
                                <div className="pixelInfoHolderValue">{displayInfoPixelId}</div>
                            </div>
                            <div className="pixelInfoHolder">
                                <div className="pixelInfoHolderHeader">COLOR HEX:</div>
                                <div className="pixelInfoHolderValue">#{displayInfoPixelColorHex}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="ownerInfoContainer">Owner:
                    <div id="ownerInfoAddress">{displayInfoAddress}</div>
                </div>
                <div id="rankInfoContainer">Wallet Rank:
                    <div id="rankInfoValue"><div id="rankValueMain">{rank}</div> / {stateGlobalPixelMap.length}</div>
                </div>
            </div>
        );
    }

    /*
        Controls component and all subsequent functions
    */
    const Controls = () => {
        return (
            <Head>
                <!-- Global site tag (gtag.js) - Google Analytics -->
                <script async src="https://www.googletagmanager.com/gtag/js?id=G-S9WDY86NW3"></script>
                <script>
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', 'G-S9WDY86NW3');
                </script>
            </Head>
            <div id="controllerContainer">
                <div id="menuButton" onClick={showMenu}>
                    <img className="menuImg" src='/img/icons/menu.png' alt="menuImg"></img>
                    Menu
                </div>
                <div id="header">
                    <img id="logo" src="/img/logo/FlowBankLogo.png" alt="logoImg"></img>
                    <div id="headerInfo">
                        <div className="headerInfoContainer">
                            <div className="headerInfoTitle">Total Coins:</div>
                            <div className="headerInfoValue">{amountMinted}</div>
                        </div>
                        <div className="headerInfoContainer">
                            <div className="headerInfoTitle">Total Owners:</div>
                            <div className="headerInfoValue">{amountOwners}</div>
                        </div>
                    </div>
                </div>
                {user.loggedIn ? (
                    <div id="userInfo" onClick={showUserInfo}>
                        <img className="menuImg" src="./img/icons/wallet.png" alt="walletImg"></img>
                        <div>User Info</div>
                    </div>

                ) : (
                    <div id="walletLogIn" onClick={logIn}>
                        <img className="menuImg" src="./img/icons/wallet.png" alt="walletImg"></img>
                        <div>Log In</div>
                    </div>
                )}
                <ControllerButtons />
            </div>
        );
    }

    const ControllerButtons = () => {
        useEffect(()=>{
            setActiveButton();
        }, []);

        return (
            user.loggedIn ? (
                <div id="contractControllerContainer">
                    <div className="contractButton" onClick={activateMintDisplay} onTouchStart={activateMintDisplay}>
                        <img className="menuImg" src="./img/icons/mint.png" alt="mintImg"></img>
                        Mint
                    </div>
                    <div className="contractButton" onClick={activateEditDisplay} onTouchStart={activateEditDisplay}>
                        <img className="menuImg" src="./img/icons/edit.png" alt="editImg"></img>
                        Edit
                    </div>
                    <div id="activePage" className="contractButton" onClick={activateHomeDisplay} onTouchStart={activateHomeDisplay}>
                        <img className="menuImg" src="./img/icons/home.png" alt="homeImg"></img>
                        Home
                    </div>
                    <div className="contractButton" onClick={activateTransferDisplay} onTouchStart={activateTransferDisplay}>
                        <img className="menuImg" src="./img/icons/transfer.png" alt="transferImg"></img>
                        Transfer
                    </div>
                    <div className="contractButton"
                        onClick={()=>{
                            var userCollectionId = localStorage.getItem("userCollectionId");
                            setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));
                            setDisplayInfoAddress(userCollectionId);
                            activateInfoDisplay();
                        }}
                        onTouchStart={()=>{
                            var userCollectionId = localStorage.getItem("userCollectionId");
                            setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));
                            setDisplayInfoAddress(userCollectionId);
                            activateInfoDisplay();
                        }}>
                        <img className="menuImg" src="./img/icons/find.png" alt="findImg"></img>
                        Find
                    </div>
                </div>
            ) : (
                <div id="contractControllerContainer">
                    <div id="activePage" className="contractButton" onClick={activateHomeDisplay} onTouchStart={activateHomeDisplay}>
                        <img className="menuImg" src="./img/icons/home.png" alt="menuImg"></img>
                        Home
                    </div>
                </div>
            )
        );
    }

    function activateMintDisplay() {
        var userCollectionId = localStorage.getItem("userCollectionId");
        setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));

        setDisplayMint(true);
        setDisplayEdit(false);
        setDisplayTransfer(false);
        setDisplayInfo(false);

        document.getElementById("activePage").id = "";
        document.getElementsByClassName("contractButton")[0].id = "activePage";

        document.getElementById("pagesContainer").classList.add("openPages");
    }

    function activateEditDisplay() {
        var userCollectionId = localStorage.getItem("userCollectionId");
        setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));

        setDisplayMint(false);
        setDisplayEdit(true);
        setDisplayTransfer(false);
        setDisplayInfo(false);

        document.getElementById("activePage").id = "";
        document.getElementsByClassName("contractButton")[1].id = "activePage";

        document.getElementById("pagesContainer").classList.add("openPages");
    }

    function activateHomeDisplay() {
        var userCollectionId = localStorage.getItem("userCollectionId");
        setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));

        document.getElementById("activePage").id = "";
        var contractButtons = document.getElementsByClassName("contractButton")
        if(contractButtons.length > 1) {
            contractButtons[2].id = "activePage";
        } else {
            contractButtons[0].id = "activePage";
        }

        document.getElementById("pagesContainer").classList.remove("openPages");
    }

    function activateTransferDisplay() {
        var userCollectionId = localStorage.getItem("userCollectionId");
        setBlockViewer(BlockViewer({collectionId: userCollectionId, startSize: blockViewerZoom, currentPixelMap: stateGlobalPixelMap}));

        setDisplayMint(false);
        setDisplayEdit(false);
        setDisplayTransfer(true);
        setDisplayInfo(false);

        document.getElementById("activePage").id = "";
        document.getElementsByClassName("contractButton")[3].id = "activePage";

        document.getElementById("pagesContainer").classList.add("openPages");
    }

    function activateInfoDisplay() {
        setDisplayMint(false);
        setDisplayEdit(false);
        setDisplayTransfer(false);
        setDisplayInfo(true);

        document.getElementById("activePage").id = "";
        document.getElementsByClassName("contractButton")[4].id = "activePage";

        document.getElementById("pagesContainer").classList.add("openPages");
    }



    /*
        The following is for the BlockViewer
        Used inside the pages for viewing bank collections
    */
    const BlockViewer = (props) => {
        // var collectionId = localStorage.getItem("userCollectionId");
        var collectionId = props.collectionId;

        var startSize = props.startSize;
        var currentPixelMap = props.currentPixelMap;

        var numPixels = 0;
        var pixelWidth = 0;
        var walletPixels = [];

        //filter to get the user's pixels
        walletPixels = currentPixelMap.filter(obj => {
            return parseInt(obj.owner) === parseInt(collectionId);
        });

        if(walletPixels.length > 0) {
            walletPixels = walletPixels[0].pixels;

            numPixels = walletPixels.length;

            pixelWidth = Math.ceil(Math.sqrt(numPixels));
        }

        //create html for our walletBlock
        var innerPixels = [];

        if(collectionId === "null") {
            innerPixels.push(<div className="initCollectionButton" key="none" onClick={async () => {
                var transactionId = await setUpCollection(fcl);

                const transaction = await fcl.tx(transactionId).onceSealed();
                // console.log(transaction);
            }}>Click Here to Initalize FlowBank Collection in Your Account</div>);
        } else {
            for(var i = 0; i < walletPixels.length; i++) {
                innerPixels.push(<BlockViewerPixel key={i} props={{pixelInfo: walletPixels[i], width: pixelWidth, startSize: startSize}} />);  //not sure if making key=i is proper
            }

            if(innerPixels.length === 0) {
                innerPixels.push(<div id="noBillyErrorMessage" key="none">You Have No Coins</div>);
            }
        }


        if(pixelWidth === 0) {
            pixelWidth = 10;
        }

        return (
            <div id="blockViewerMapInteractionContainer">
                <div className="redrawContainer">
                    <div
                        className="redrawIncrease"
                        onClick={(e) => {
                            e.stopPropagation();
                            blockViewerZoom++;
                            setBlockViewer(BlockViewer({collectionId: collectionId, startSize: blockViewerZoom, currentPixelMap: currentPixelMap}));
                        }}
                    >+</div>
                    <div
                        className="redrawDecrease"
                        onClick={() => {
                            if(blockViewerZoom > 1) {
                                blockViewerZoom--;
                                setBlockViewer(BlockViewer({collectionId: collectionId, startSize: blockViewerZoom, currentPixelMap: currentPixelMap}));
                            }
                        }}
                    >-</div>
                </div>
                <MapInteraction>
                {
                    ({ translation, scale }) => {
                        // console.log('width', ref.current ? ref.current.offsetWidth : 0);
                        return (
                            <div id="blockViewerPixelContainer"
                                style={{
                                    // width: (zoomSize*10 * pixelWidth) + (pixelWidth*2) + "px",
                                    // height: "250px",
                                    // backgroundColor: "gold",
                                    marginTop: "calc(125px + 2vmin)",
                                    transformOrigin: "0px 0px 0px",
                                    transform: "matrix("+scale+ ", 0, 0, " + scale + ", "+ translation.x + ", " + translation.y + ")",
                                    // display: "inline-block"
                                }}
                            >
                                <div
                                    style={{
                                        display: "inline-block",
                                        width: ((30 + (10 * blockViewerZoom)) * startSize * pixelWidth) + (pixelWidth*2) + "px",
                                    }}
                                >
                                    {innerPixels}
                                </div>
                            </div>
                        );
                    }
                }
                </MapInteraction>
            </div>
        );
    }

    const BlockViewerPixel = (props) => {
        var pixelInfo = props.props.pixelInfo;
        var width = props.props.width;
        var startSize = props.props.startSize;

        return (
            <div className="blockViewerPixel"
                style={{
                    backgroundColor: "#"+pixelInfo.colorHex,
                    width: ((30 + (10 * blockViewerZoom)) * startSize)+"px",
                    height: ((30 + (10 * blockViewerZoom)) * startSize)+"px",
                    borderRadius:(((30 + (10 * blockViewerZoom)) * startSize) / 2) + "px",
                    float: "left",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}
                onClick={(e) => {
                    pixelClickHandler(e, pixelInfo);
                }}
                onTouchStart={(e) => {
                    pixelClickHandler(e, pixelInfo);
                }}
            >
                {pixelInfo.id}
            </div>
        );
    }

    const pixelClickHandler = (e, pixelInfo) => {
        // e.stopPropagation();
        if(document.getElementsByClassName("activeDisplayController").length > 0) {
            var activeId = document.getElementsByClassName("activeDisplayController")[0].id;
            if(activeId === "transferController") {
                addToTransfer(pixelInfo);
            } else if(activeId === "editController") {
                addToEdit(e, pixelInfo);
            } else if(activeId == "infoController") {
                addToInfo(pixelInfo);
            } else if(activeId == "mintController") {
                console.log("This pixel is #"+pixelInfo.colorHex);
            }
        }

    }

    function addToInfo(pixel) {
        setDisplayInfoPixelId(pixel.id);
        setDisplayInfoPixelColorHex(pixel.colorHex);
    }

    /* Menu pop up functions */
    function closeMenu() {
        document.getElementById("menuContainer").style.display = "none";
    }

    function showMenu() {
        document.getElementById("menuContainer").style.display = "flex";
    }

    function setElementActive(target) {
        document.getElementById("activeMenuTab").id = "";
        target.id = "activeMenuTab";
    }

    function setBackgroundColorEvent(color) {
        document.getElementById("container").style.backgroundColor = color;
        document.getElementById("pagesContainer").style.backgroundColor = color;
    }

    function getRandomHex() {
        return '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
    }

    function expandVideo(e) {
        console.log(e.target);

        e.target.parentNode.parentNode.style.height = "auto";
        e.target.style.display = "none";
        e.target.parentNode.children[1].style.display = "flex";
    }

    function closeVideo(e) {
        console.log(e.target);

        e.target.parentNode.parentNode.style.height = "50px";
        e.target.style.display = "none";
        e.target.parentNode.children[0].style.display = "flex";
    }

    const VideoExpander = (props) => {
        return (
            <div className="videoExpander" >
                <div className="expanderOpen" onClick={expandVideo}>
                    <img className="expanderImg imgOpen" src="./img/icons/expand.png" />
                    <div className="expanderText" >Open Video</div>
                    <img className="expanderImg imgOpen" src="./img/icons/expand.png" />
                </div>
                <div className="expanderClose" onClick={closeVideo}>
                    <img className="expanderImg imgClose" src="./img/icons/expand.png" />
                    <div className="expanderText" >Close Video</div>
                    <img className="expanderImg imgClose" src="./img/icons/expand.png" />
                </div>
            </div>
        );
    }

    const Menu = (props) => {
        const [menuDisplay, setMenuDisplay] = useState("showWhitepaper");
        const [backgroundColor, setBackgroundColor] = useState("#f8f8ff");

        return (
            <div id="menuContainer" onClick={closeMenu}>
                <div id="closeMenuButton" onClick={closeMenu}>
                    <img className="menuImg" src="./img/icons/close.png" alt="closeMenu"></img>
                    Close
                </div>
                <div id="menuContent">
                    <div id="menuTabContainer">
                        <div id="activeMenuTab" className="menuTab" onClick={(e) => {
                            e.stopPropagation();
                            setMenuDisplay("showWhitepaper");
                            setElementActive(e.target);
                        }}>Whitepaper</div>
                        <div className="menuTab" onClick={(e) => {
                            e.stopPropagation();
                            setMenuDisplay("showHowTo");
                            setElementActive(e.target);
                        }}>How-To</div>
                        <div className="menuTab" onClick={(e) => {
                            e.stopPropagation();
                            setMenuDisplay("showExtra");
                            setElementActive(e.target);

                        }}>Extra</div>
                    </div>
                    <div id={menuDisplay} className="menuContentHolder" onClick={(e) => {e.stopPropagation();}}>
                        <div className="menuContentPage">
                            <ul className="menuContentPageList">
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">This a proof-of-concept project deployed on the Flow blockchain test network.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Because this is on the test network it does not cost any real money, and is intended to be an educational tool that anyone can participate in to get familiar with NFT/Web3.0 projects and the abilities of the Flow blockchain.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">The goal of this project is to show the capabilities and flexibility of the Cadence programming language create by Dapper Labs for the Flow blockchain.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">In order to set up your account please view the How To section.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Cost to mint: 1 FlowToken = 1 FlowBank Coin</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">All wallets are displayed as a square of the amount they own</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Largest wallets will be displayed on top benefiting those with more in the pot.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">All metadata is stored on IPFS (decentralized data storage).</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Idea to be the Finviz of Flow - meaning it allows you to visualize the supply/demand price/popularity of a token/nft by seeing how many owners there are</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">You edit the metadata (on our website which then accesses our contract) of your Coin to change the color, allowing for the NFT to be a recreatable piece of pixel art for as long as the Flow network survives.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Collaborative NFT where everyone can design their block of the picture.</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">There are many different ways this type of storage can be used for other projects:</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet spacer"/>
                                        <div className="menuItemText">Could change the cost of minting for custom tokenomics</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet spacer"/>
                                        <div className="menuItemText">Could have multiple editable attributes other than just color for NFT customization</div>
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet spacer"/>
                                        <div className="menuItemText">Could be used as storage of coins for gaming projects (video games, casinos, etc)</div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="menuContentPage">
                            <ul className="menuContentPageList">
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet" />
                                        <div className="menuItemText">Connect To Blocto Wallet</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/SignUpBlocto.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Set Up Collection In Account</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/SetUpAccount.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Get Test Network FlowTokens</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/FundAccount.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Mint A Coin</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/MintCoin.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Edit Coin Color</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/EditColor.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Transfer A Coin To Different Wallet</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/TransferCoin.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                                <li>
                                    <div className="listItemHolder">
                                        <div className="menuBullet"/>
                                        <div className="menuItemText">Get Coin Info</div>
                                    </div>
                                    <div className="videoContainer">
                                        <video controls muted loop className="howToVideo" loading="lazy"><source src="./video/howTo/GetCoinInfo.mp4" type="video/mp4" /></video>
                                        <VideoExpander />
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="menuContentPage">
                            <div className="menuContentPageRow">Developed by <a href="https://www.boolalpha.com">boolalpha</a> from michigan</div>
                            <div className="menuContentPageRow">The contract / source code can be found <a href="https://github.com/boolalpha/FlowBank">here</a></div>
                            <div className="menuContentPageRow">For use on mobile, download the official Blocto app and use the in-app browser.</div>
                            <div className="menuContentPageRow">Any questions please reach out to <a href="mailto:support@onflowbank.com">support@onflowbank.com</a> or <a href="mailto:support@onflowbank.org">support@onflowbank.org</a></div>
                            <div className="menuContentPageRow">Background color:
                                <div id="backgroundColorInputWrapper" style={{backgroundColor: backgroundColor}}>
                                    <input id="backgroundColorInput" type="color" value={backgroundColor} onClick={(e)=>{e.stopPropagation();}} onChange={(e)=>{
                                        setBackgroundColor(e.target.value);
                                        setBackgroundColorEvent(e.target.value);
                                    }}></input>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const Loading = () => {
        return (
            <div id="loadingContainer" className="popUpContainer" onClick={closeLoading}>
                <div className="popUpElemContainer cssload-wrap">
                    <div className="cssload-container">
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                        <span className="cssload-dots"></span>
                    </div>
                    <div id="loadingButtonContainer">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    function showLoading() {
        document.getElementById("loadingContainer").style.display = "flex";
    }

    function closeLoading() {
        document.getElementById("loadingContainer").style.display = "none";
    }

    const UserInfoPopUp = () => {
        useEffect(async () => {
            if(user.loggedIn) {
                if(user.addr !== undefined) {
                    var collectionCheck = await checkUserHasCollection(fcl, user.addr);
                    setUserHasCollection(collectionCheck);

                    var vaultCheck = await checkUserHasVault(fcl, user.addr);
                    setUserHasVault(vaultCheck);
                }
            }
        });

        return (
            <div id="userInfoContainer" className="popUpContainer" onClick={closeUserInfo}>
                <div id="closeUserInfoButton" onClick={closeUserInfo}>
                    <img className="menuImg" src="./img/icons/close.png" alt="closeUser"></img>
                    Close
                </div>
                <div className="popUpElemContainer" onClick={(e) => {e.stopPropagation();}}>
                    <div id="currentUser">Current User: {user.addr}</div>
                    {userHasCollection ?
                        (
                            <div className="checkSucceessButton">
                                <img className="menuImg" src="./img/icons/checked.png" alt="checkedImg"></img>
                                <div>You have already initialized a FlowBank Collection in your account!</div>
                            </div>
                        ) : (
                            <div className="initCollectionButton" onClick={async () => {
                                await setUpCollection(fcl);
                                var collectionCheck = await checkUserHasCollection(fcl, user.addr);
                                setUserHasCollection(collectionCheck);
                            }}>
                                <img className="menuImg" src="./img/icons/wallet.png" alt="walletImg"></img>
                                <div>Click Here to Initalize FlowBank Collection in Your Account</div>
                            </div>
                        )
                    }

                    {userHasVault ?
                        (
                            <div className="checkSucceessButton">
                                <img className="menuImg" src="./img/icons/checked.png" alt="checkedImg"></img>
                                <div>You have already initialized a FlowToken Vault in your account!</div>
                            </div>
                        ) : (
                            <div id="vaultSetUp" onClick={async () => {
                                await setUpVault(fcl);
                                var vaultCheck = await checkUserHasVault(fcl, user.addr);
                                setUserHasVault(vaultCheck);
                            }}>
                                <img className="menuImg" src="./img/icons/wallet.png" alt="walletImg"></img>
                                <div>Click Here to Initalize FlowToken Vault in Your Account</div>
                            </div>
                        )
                    }

                    <div id="walletLogOut" onClick={logOut}>
                        <img className="menuImg" src="./img/icons/logout.png" alt="looutImg"></img>
                        <div>Log Out</div>
                    </div>
                </div>
            </div>
        );
    }

    function showUserInfo() {
        document.getElementById("userInfoContainer").style.display = "flex";
    }

    function closeUserInfo() {
        document.getElementById("userInfoContainer").style.display = "none";
    }

    const MessagePopUp = () => {
        return (
            <div id="popUpMessage" className="popUpContainer" onClick={closePopUpMessage}>
                <div className="popUpElemContainer">
                    <div id="popUpMessageContent">Lorem Ipsum</div>
                    <div id="popUpButtonContainer">
                        <div id="popUpButtonClose" onClick={closePopUpMessage}>Close</div>
                    </div>
                </div>
            </div>
        );
    }

    function closePopUpMessage() {
        document.getElementById("popUpMessage").style.display = "none";
    }

    function displayPopUpMessage(message) {
        document.getElementById("popUpMessageContent").innerHTML = message;
        document.getElementById("popUpMessage").style.display = "flex";
    }

    const SuccessPopUp = () => {
        return (
            <div id="popUpSuccess" className="popUpContainer" onClick={activateHomeDisplay}>
                <div className="popUpElemContainer">
                    <div id="popUpSuccessContent">Lorem Ipsum</div>
                    <div className="popUpButtonContainer">
                        <div className="popUpButtonClose" onClick={activateHomeDisplay}>Close</div>
                    </div>
                </div>
            </div>
        );
    }

    function displayPopUpSuccess(message) {
        document.getElementById("popUpSuccessContent").innerHTML = message;
        document.getElementById("popUpSuccess").style.display = "flex";
    }

    return (

        <div id="container">
            <div id="pixelMapContainer">
                {pixelMap}
            </div>
            <div id="pagesContainer">
                {blockViewer}
                <Pages />
            </div>
            <Controls />
            <Menu />
            <Loading />
            <UserInfoPopUp />
            <MessagePopUp />
            <SuccessPopUp />
        </div>
    );

}
