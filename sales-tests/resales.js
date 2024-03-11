
const { keyStores, Near, Account, KeyPair, utils } = require("near-api-js")
const path = require("path");
const { assert } = require("console");
const homedir = require("os").homedir();
require('dotenv').config();

const { buyTickets, logBalances, getOwnedTickets, changeMarketplaceMaxMetadataBytes, listTicket, testSignature, testKeypomSign, generateKeypomSignature } = require("../helpers/helper.js");

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

	let keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

	let nearConfig = {
	    networkId: network,
	    keyStore: keyStore,
	    nodeUrl: `https://rpc.${network}.near.org`,
	    walletUrl: `https://wallet.${network}.near.org`,
	    helperUrl: `https://helper.${network}.near.org`,
	    explorerUrl: `https://explorer.${network}.near.org`,
	};

	let near = new Near(nearConfig);

	const fundingAccount = new Account(near.connection, funder);
    const attendeeAccount = new Account(near.connection, attendee);
    const minqi = new Account(near.connection, "mintlu.testnet");
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
    
    // console.log("~~~~~~~~~~~~~~~ Legit ticket resell ~~~~~~~~~~~~~~~")
    // console.log("Balances prior to purchase")
    // logBalances(attendeeAccount, fundingAccount)

    // let tickets;
    // let keypairs;
    // let pre_test_owned_tix = owned_tix.length
    // try{
    //     // Try to buy tickets for less than they cost
    //     let buyTicketsRes = await buyTickets({
    //         event_id, 
    //         drop_id, 
    //         numKeys: 1, 
    //         attached_deposit: 1, 
    //         attendeeAccount
    //     })

    //     tickets = buyTicketsRes[0]
    //     keypairs = buyTicketsRes[1]
        
    //     owned_tix = await getOwnedTickets(attendeeAccount)
    //     console.log(`Owned tickets: ${owned_tix.length}`)
    //     assert(owned_tix.length - pre_test_owned_tix == 1, "Expected to have 1 more ticket")
    //     console.log("Balances after buying ticket to resell")
    //     logBalances(attendeeAccount, fundingAccount)
    // }catch(e){
    //    console.warn("Buying for resale has failed!: ", e)
    // }

    // let old_resales = await attendeeAccount.viewFunction({
    //     contractId: MARKETPLACE, 
    //     methodName: "get_resales_per_event",
    //     args:{
    //         event_id
    //     }
    // })

    // try{
    //     // Try listing for within marketplace rules
    //     await listTicket(1.2, keypairs[0], attendeeAccount)
    //     event_resales = await attendeeAccount.viewFunction({
    //         contractId: MARKETPLACE, 
    //         methodName: "get_resales_per_event",
    //         args:{
    //             event_id
    //         }
    //     })
    //     console.log(`Resales: ${event_resales.length}`)
    //     assert(old_resales.length - event_resales.length == 1, "Expected to have 0 resales")
    // }catch(e){
    //     console.log(e)
    //     console.warn("Listing ticket failed!")
    // }

    console.log("~~~~~~~~~~~~~~~ Buying Resale Tickets ~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)
    logBalances(minqi, fundingAccount)
    try{
        let new_key = KeyPair.fromRandom('ed25519')
        let new_public_key = new_key.publicKey.toString()

        let memo = {
            linkdrop_pk: "ed25519:3mGGeCp37RqdAJxu96PTNE1n1bE3X9tFufmPbdVDuVQE",
            new_public_key
        }

        let minqi_pre_test_owned_tix = await getOwnedTickets(minqi)
        let attendee_pre_test_owned_tix = await getOwnedTickets(attendeeAccount)

        await minqi.functionCall({
            contractId: MARKETPLACE, 
            methodName: 'buy_resale',
            args: {
                drop_id,
                memo,
                new_owner: minqi.accountId,
            },
            attachedDeposit: utils.format.parseNearAmount("1.5"),
            gas: "300000000000000"
        })
        
        owned_tix = await getOwnedTickets(attendeeAccount)
        let minqi_owned_tix = await getOwnedTickets(minqi)
        console.log(`Owned tickets: ${owned_tix.length}`)
        assert(minqi_owned_tix.length - minqi_pre_test_owned_tix.length == 1, "Expected to have 1 ticket")
        assert(attendee_pre_test_owned_tix - owned_tix.length == 1, "Expected to have 1 less ticket")

        console.log("Balances after multiple ticket purchase")
        logBalances(attendeeAccount, fundingAccount)
        logBalances(minqi, fundingAccount)
    }catch(e){
       console.warn("Purchasing Resale has failed!: ", e)
    }

}
resales()