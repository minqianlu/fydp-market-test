const { initKeypom, createDrop, getEnv, formatLinkdropUrl, getPubFromSecret, getKeyInformation, generateKeys } = require("@keypom/core"); 
const { parseNearAmount, formatNearAmount } = require("@near-js/utils");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Near } = require("@near-js/wallet-account");
const { Account } = require("@near-js/accounts");
const path = require("path");
const { assert } = require("console");
const homedir = require("os").homedir();
require('dotenv').config();

const { buyTickets, logBalances, getOwnedTickets, changeMarketplaceMaxMetadataBytes, listTicket } = require("../helpers/helper.js");

async function initialSale(){
	// Initiate connection to the NEAR blockchain.
	const network = "testnet"
	const CREDENTIALS_DIR = ".near-credentials";
	const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);

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
	const fundingAccount = new Account(near.connection, funder);
    const attendeeAccount = new Account(near.connection, attendee);
    const marketplaceAccount = new Account(near.connection, MARKETPLACE);

	await initKeypom({
	    near,
	    network
	});

    let owned_tix = await getOwnedTickets(attendeeAccount);

    // EACH TICKET COSTS 1 NEAR

    console.log("~~~~~~~~~~~~~~~ Under Paying for Ticket ~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)
    let pre_test_owned_tix = owned_tix.length
    try{
        // Try to buy tickets for less than they cost
        await buyTickets({
            event_id, 
            drop_id, 
            numKeys: 1, 
            attached_deposit: 0.5, 
            attendeeAccount
        })
        console.warn("Underpaying expected to fail")
    }catch(e){
       console.log("As expected, failed to buy ticket")
       console.log("Balances after purchase")
       logBalances(attendeeAccount, fundingAccount)

       owned_tix = await getOwnedTickets(attendeeAccount)
       console.log(`Owned tickets: ${owned_tix.length}`)
       assert(owned_tix.length - pre_test_owned_tix == 0, "Expected to have 0 tickets")
    }

    console.log("~~~~~~~~~~~~~~~ Violate Metadata Size~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)
    pre_test_owned_tix = owned_tix.length
    
    // change it metadata size maximum to 1
    await changeMarketplaceMaxMetadataBytes(marketplaceAccount, 1)

    let ticket_key = await generateKeys({numKeys: 1})
    
    try{
         // buying ticket where deposit is not enough for ticket price
        await attendeeAccount.functionCall({
            contractId: MARKETPLACE, 
            methodName: 'buy_initial_sale', 
            args: {
                event_id,
                drop_id,
                new_keys: [{
                    public_key: ticket_key.publicKeys[0],
                    key_owner: attendeeAccount.accountId,
                    metadata: {
                        key_custom: "this_is_a_long_value"
                    }
                
                }],
            }, 
            gas: "300000000000000",
            attachedDeposit: parseNearAmount(attached_deposit.toString())
        })

        console.warn("Metadata violation expected to fail")
    }catch(e){
       console.log("As expected, failed to buy ticket")
       console.log("Balances after failed metadata purchase")
       logBalances(attendeeAccount, fundingAccount)

       owned_tix = await getOwnedTickets(attendeeAccount)
       assert(owned_tix.length - pre_test_owned_tix == 1, "Expected to have 0 tickets")
    }

    await changeMarketplaceMaxMetadataBytes(marketplaceAccount, 10000000)


    console.log("~~~~~~~~~~~~~~~ Over Paying ~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)
    pre_test_owned_tix = owned_tix.length

    try{
        // Try to buy tickets for less than they cost
        await buyTickets({
            event_id, 
            drop_id, 
            numKeys: 1, 
            attached_deposit: 1, 
            attendeeAccount
        })
        
        owned_tix = await getOwnedTickets(attendeeAccount)
        console.log(`Owned tickets: ${owned_tix.length}`)
        assert(owned_tix.length - pre_test_owned_tix== 1, "Expected to have 1 tickets")

        console.log("Balances after overpaying purchase")
        logBalances(attendeeAccount, fundingAccount)
    }catch(e){
       console.warn("Over-paying has failed!: ", e)
    }

    console.log("~~~~~~~~~~~~~~~ Multiple Tickets ~~~~~~~~~~~~~~~")
    console.log("Balances prior to purchase")
    logBalances(attendeeAccount, fundingAccount)
    pre_test_owned_tix = owned_tix.length

    try{
        // Try to buy tickets for less than they cost
        await buyTickets({
            event_id, 
            drop_id, 
            numKeys: 5, 
            attached_deposit: 5, 
            attendeeAccount
        })
        
        owned_tix = await getOwnedTickets(attendeeAccount)
        console.log(`Owned tickets: ${owned_tix.length}`)
        assert(owned_tix.length - pre_test_owned_tix == 6, "Expected to have 6 tickets")

        console.log("Balances after multiple ticket purchase")
        logBalances(attendeeAccount, fundingAccount)
    }catch(e){
       console.warn("Multiple ticket purchase has failed!: ", e)
    }

}
initialSale()