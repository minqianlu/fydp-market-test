const { initKeypom, createDrop, getEnv, formatLinkdropUrl, getPubFromSecret, getKeyInformation, generateKeys } = require("@keypom/core"); 
const { parseNearAmount, formatNearAmount } = require("@near-js/utils");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Near } = require("@near-js/wallet-account");
const { Account } = require("@near-js/accounts");
//const { InMemoryKeyStore } = require("@near-js/keystores");
const path = require("path");
const { assert } = require("console");
const homedir = require("os").homedir();
require('dotenv').config();

const { buyTickets, logBalances, getOwnedTickets, changeMarketplaceMaxMetadataBytes, listTicket, testSignature, testKeypomSign } = require("../helpers/helper");
const { KeyPair } = require("@near-js/crypto");

async function resales(){
	// Initiate connection to the NEAR blockchain.
	const CREDENTIALS_DIR = ".near-credentials";
	const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);
    
	const network = process.env.NETWORK;
    const MARKETPLACE = process.env.MARKETPLACE;
    const KEYPOM = process.env.KEYPOM;
    let event_id = process.env.EVENT_ID;
    let drop_id = process.env.DROP_ID;
    const funder = process.env.FUNDER;
    const attendee = process.env.ATTENDEE;

	let keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);

	let nearConfig = {
	    networkId: network,
	    keyStore: keyStore,
	    nodeUrl: `https://rpc.${network}.near.org`,
	    walletUrl: `https://wallet.${network}.near.org`,
	    helperUrl: `https://helper.${network}.near.org`,
	    explorerUrl: `https://explorer.${network}.near.org`,
	};

	let near = new Near(nearConfig);

    await initKeypom({
	    near,
	    network
	});

	const fundingAccount = new Account(near.connection, funder);
    const attendeeAccount = new Account(near.connection, attendee);
    const marketplaceAccount = new Account(near.connection, MARKETPLACE);
    const keypomAccount = new Account(near.connection, KEYPOM);

    // let funderKeys = KeyPair.fromString("ed25519:8pvhnpAC8AVr64ygox2txT68daJ7QRuYhKfvS2uWJdoQ8BzJETUVLZrcQLth2gMoGtUZHBVyr3vNfujHuRSjN5q")
    // let attendeeKeys = KeyPair.fromString("ed25519:3GKJJGca7pvYNcX9XxijE9TAYvobwmk2vxUnzqvpZY5SGXezW5rSf5GYiUrtgaEXc2VkzFvS5rT7217NSsgtbYCi")

    // keyStore.setKey(network, funder, funderKeys)
    // keyStore.setKey(network, attendee, attendeeKeys)
    
    // let b58_signing_sk = await attendeeAccount.viewFunction({
    //     contractId: KEYPOM, 
    //     methodName: "get_global_secret_key",
    //     args:{}
    // })
    // let keypomKey = KeyPair.fromString("ed25519:" + b58_signing_sk)

    // keyStore.setKey(network, KEYPOM, keypomKey)

    let owned_tix = await getOwnedTickets(attendeeAccount);

    // EACH TICKET COSTS 1 NEAR
    // TODO: SIGNATURE NEEDED FOR RESALES


    console.log("~~~~~~~~~~~~~~~ Listing Non-existent ticket ~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)

    let tickets;
    let pre_test_owned_tix = owned_tix.length
    try{
        // Try to buy tickets for less than they cost
        tickets = await buyTickets({
            event_id, 
            drop_id, 
            numKeys: 1, 
            attached_deposit: 1, 
            attendeeAccount
        })
        
        owned_tix = await getOwnedTickets(attendeeAccount)
        console.log(`Owned tickets: ${owned_tix.length}`)
        assert(owned_tix.length - pre_test_owned_tix == 1, "Expected to have 1 more ticket")
        console.log("Balances after buying ticket to resell")
        logBalances(attendeeAccount, fundingAccount)
    }catch(e){
       console.warn("Buying for resale has failed!: ", e)
    }

    console.log(tickets[0].public_key)

    let public_key = tickets[0].public_key

    try{
        // Try listing for higher than marketplace allows for
        await listTicket(10, public_key, attendeeAccount)
        console.warn("Listing ticket has succeeded when it should not have!")
    }catch(e){
        console.log(e)
        event_resales = await attendeeAccount.viewFunction({
            contractId: MARKETPLACE, 
            methodName: "get_resales_per_event",
            args:{
                event_id
            }
        })
        console.log(`Resales: ${event_resales.length}`)
        assert(event_resales.length == 0, "Expected to have 0 resales")
    }

    // console.log("~~~~~~~~~~~~~~~ Buying then selling Tickets ~~~~~~~~~~~~~~~")
    // console.log("Balances prior to purchase")
    // logBalances(attendeeAccount, fundingAccount)
    // let tickets;
    // let pre_test_owned_tix = owned_tix.length
    // try{
    //     // Try to buy tickets for less than they cost
    //     tickets = await buyTickets({
    //         event_id, 
    //         drop_id, 
    //         numKeys: 1, 
    //         attached_deposit: 1, 
    //         attendeeAccount
    //     })
        
    //     owned_tix = await getOwnedTickets(attendeeAccount)
    //     console.log(`Owned tickets: ${owned_tix.length}`)
    //     assert(owned_tix.length - pre_test_owned_tix == 1, "Expected to have 1 more ticket")
    //     console.log("Balances after buying ticket to resell")
    //     logBalances(attendeeAccount, fundingAccount)
    // }catch(e){
    //    console.warn("Buying for resale has failed!: ", e)
    // }


    // let event_resales = []
    // console.log("~~~~~~~~~~~~~~~ Listing for higher than max ~~~~~~~~~~~~~~~")
    // console.log("Balances prior to purchase")

    // try{
    //     // Try listing for higher than marketplace allows for
    //     await listTicket(10, tickets[0].public_key, attendeeAccount)
    //     console.warn("Listing ticket has succeeded when it should not have!")
    // }catch(e){
    //     event_resales = await attendeeAccount.viewFunction({
    //         contractId: MARKETPLACE, 
    //         methodName: "get_resales_per_event",
    //         args:{
    //             event_id
    //         }
    //     })
    //     console.log(`Resales: ${event_resales.length}`)
    //     assert(event_resales.length == 0, "Expected to have 0 resales")
    // }
    
    // // List for a normal price
    // console.log("~~~~~~~~~~~~~~~ Normal Listing ~~~~~~~~~~~~~~~")
    // console.log("Balances prior to purchase")

    // try{
    //     await listTicket(1.5, tickets[0].public_key, attendeeAccount)
    //     event_resales = await attendeeAccount.viewFunction({
    //         contractId: MARKETPLACE, 
    //         methodName: "get_resales_per_event",
    //         args:{
    //             event_id
    //         }
    //     })
    //     console.log(`Resales: ${event_resales.length}`)
    //     assert(event_resales.length == 1, "Expected to have 1 resales")
    // }catch(e){
    //     console.warn("Listing ticket has failed!: ", e)
    // }







    // console.log("~~~~~~~~~~~~~~~ Buying Resale Tickets ~~~~~~~~~~~~~~~")
    // console.log("Balances prior to purchase")
    // logBalances(attendeeAccount, fundingAccount)
    // try{
    //     // Try to buy tickets for less than they cost
    //     await buyTickets({
    //         event_id, 
    //         drop_id, 
    //         numKeys: 5, 
    //         attached_deposit: 5, 
    //         attendeeAccount
    //     })
        
    //     owned_tix = await getOwnedTickets(attendeeAccount)
    //     console.log(`Owned tickets: ${owned_tix.length}`)
    //     assert(owned_tix.length == 6, "Expected to have 6 tickets")

    //     console.log("Balances after multiple ticket purchase")
    //     logBalances(attendeeAccount, fundingAccount)
    // }catch(e){
    //    console.warn("Multiple ticket purchase has failed!: ", e)
    // }

}
resales()