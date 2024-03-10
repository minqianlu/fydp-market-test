const { initKeypom, createDrop, getEnv, formatLinkdropUrl, getPubFromSecret, getKeyInformation } = require("@keypom/core"); 
const { parseNearAmount } = require("@near-js/utils");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Near } = require("@near-js/wallet-account");
const { Account } = require("@near-js/accounts");
const path = require("path");
const homedir = require("os").homedir();
require('dotenv').config();

async function addAndDeleteEvent(){
	// Initiate connection to the NEAR blockchain.
	const network = "testnet"
	const CREDENTIALS_DIR = ".near-credentials";
	const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);
	const YOUR_ACCOUNT = "minqi.testnet";

    const MARKETPLACE = "1709145202470-marketplace.testnet";
    const KEYPOM = "1709145182592-kp-ticketing.testnet";
	
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
	const fundingAccount = new Account(near.connection, YOUR_ACCOUNT);
	await initKeypom({
	    near,
	    network
	});

    let event_id = process.env.EVENT_ID;
    console.log(event_id)

    try{
        // create drop
        await fundingAccount.functionCall({
            contractId: KEYPOM, 
            methodName: 'create_drop', 
            args: {
                drop_id: event_id,
                key_data: [],
                asset_data: [
                    {
                        uses: 1,
                        assets: [],
                    }
                ],
                drop_config: {
                    add_key_allowlist: [MARKETPLACE],
                    transfer_key_allowlist: [MARKETPLACE],
                }
            }, 
            gas: "300000000000000",
            attachedDeposit: parseNearAmount("10")
        })

        // create event
		await fundingAccount.functionCall({
			contractId: MARKETPLACE, 
			methodName: 'create_event', 
			args: {
				event_id,
                funder_id: YOUR_ACCOUNT,
                info: {
                    // THIS IS A DYNAMIC KEY, NOT AN ARRAY
                    [event_id]: {
                        max_tickets: 100,
                        price: parseNearAmount("1")
                    }
                },
			}, 
			gas: "300000000000000",
			// Attcned depot of 1.5 $NEAR for creating the drop
			attachedDeposit: parseNearAmount("1.5")
		});

        let event = await fundingAccount.viewFunction({
            contractId: MARKETPLACE, 
            methodName: "get_event_information",
            args:{
                event_id: event_id
            }
        })
        console.log(event)
    }catch(e){
        console.log(`error creating drop: ${e}`)
    }

}
addAndDeleteEvent()