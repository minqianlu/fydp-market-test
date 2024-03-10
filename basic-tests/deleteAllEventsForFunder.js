const { initKeypom, createDrop, getEnv, formatLinkdropUrl, getPubFromSecret, getKeyInformation } = require("@keypom/core"); 
const { parseNearAmount } = require("@near-js/utils");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Near } = require("@near-js/wallet-account");
const { Account } = require("@near-js/accounts");
const path = require("path");
const homedir = require("os").homedir();

async function addAndDeleteEvent(){
	// Initiate connection to the NEAR blockchain.
	const network = "testnet"
	const CREDENTIALS_DIR = ".near-credentials";
	const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);
	const YOUR_ACCOUNT = "minqi.testnet";

    const MARKETPLACE = "1709145202470-marketplace.testnet";
    const KEYPOM = "1709145182592-kp-ticketing.testnet";
	
	let keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);
    //https://g.w.lavanet.xyz:443/gateway/near/rpc-http/ca3572bbb29ad43b78804603bac3a0d5
    //https://g.w.lavanet.xyz:443/gateway/neart/rpc-http/ca3572bbb29ad43b78804603bac3a0d5
	let nearConfig = {
	    networkId: network,
	    keyStore: keyStore,
	    //nodeUrl: `https://rpc.${network}.near.org`,
        nodeUrl: network=="testnet" ? 'https://g.w.lavanet.xyz:443/gateway/neart/rpc-http/ca3572bbb29ad43b78804603bac3a0d5' : 'https://g.w.lavanet.xyz:443/gateway/near/rpc-http/ca3572bbb29ad43b78804603bac3a0d5',
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

    try{

        let events = await fundingAccount.viewFunction({
            contractId: MARKETPLACE, 
            methodName: "get_events_per_funder",
            args:{
                funder: YOUR_ACCOUNT
            }
        })

        let drops = await fundingAccount.viewFunction({
            contractId: KEYPOM, 
            methodName: "get_drops_for_funder",
            args:{
                account_id: YOUR_ACCOUNT
            }
        })

        for(let drop of drops){
            await fundingAccount.functionCall({
                contractId: KEYPOM, 
                methodName: 'delete_keys', 
                args: {
                    drop_id: drop.drop_id
                }, 
                gas: "300000000000000",
            });
        }

        for(let event of events){
            // delete event on Marketplace contract
            await fundingAccount.functionCall({
                contractId: MARKETPLACE, 
                methodName: 'delete_event', 
                args: {
                    event_id: event.event_id
                }, 
                gas: "300000000000000",
            });
    
        }

        // check event supply
        let new_events = await fundingAccount.viewFunction({
            contractId: MARKETPLACE, 
            methodName: "get_events_per_funder",
            args:{
                funder: YOUR_ACCOUNT
            }
        })

        let new_drops = await fundingAccount.viewFunction({
            contractId: KEYPOM, 
            methodName: "get_drops_for_funder",
            args:{
                account_id: YOUR_ACCOUNT
            }
        })
        console.log(`events: ${new_events}`)
        console.log(`drops: ${new_drops}`)

    }catch(e){
        console.log(`error deleting event: ${e}`)
    }

}
addAndDeleteEvent()