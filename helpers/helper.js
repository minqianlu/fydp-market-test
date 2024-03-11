const { Near, keyStores, Account, KeyPair, utils, UnencryptedFileSystemKeyStore} = require("near-api-js")
const signer = require('nacl-signature');
var nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
//var ed25519 = require('ed25519');
const bs58 = require('bs58');
const path = require("path");
const { assert } = require("console");
const homedir = require("os").homedir();
require('dotenv').config();

const MARKETPLACE = process.env.MARKETPLACE;
const KEYPOM = process.env.KEYPOM;
const network = process.env.NETWORK;

async function buyTickets({
    event_id, 
    drop_id, 
    numKeys, 
    attached_deposit, 
    attendeeAccount
}){

    let keys = []
    for(let i = 0; i < numKeys; i++){
        let keyPair = KeyPair.fromRandom('ed25519');
        keys.push(keyPair)
    }

    let tickets = []  
    let raw_keys = []
    for(let key of keys){
        tickets.push({
            public_key: key.publicKey.toString(),
            key_owner: attendeeAccount.accountId
        })
    }
    // buying ticket where deposit is not enough for ticket price
    await attendeeAccount.functionCall({
        contractId: MARKETPLACE, 
        methodName: 'buy_initial_sale', 
        args: {
            event_id,
            drop_id,
            new_keys: tickets,
        }, 
        gas: "300000000000000",
        attachedDeposit: utils.format.parseNearAmount(attached_deposit.toString())
    })

    return [tickets, keys]
}

async function generateSignature(attendeeAccount, keypair){
    let sk_bytes = bs58.decode(keypair.extendedSecretKey)
    const secret_key = Buffer.from(sk_bytes).toString('base64');

    let signing_message = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "get_signing_message",
        args:{}
    })
    let key_info = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "get_key_information",
        args:{
            key: keypair.publicKey.toString()
        }
    })
    let message_nonce = key_info.message_nonce

    let message = `${signing_message}${message_nonce.toString()}`
    let message_bytes = new TextEncoder().encode(`${message}`)

    console.log("js message bytes ", message_bytes)

    const signature = nacl.sign.detached(message_bytes, sk_bytes);
    // const isValid = nacl.sign.detached.verify(message_bytes, signature, keypair.publicKey.data)
    // console.log("js verify: ", isValid)
    const base64_signature = nacl.util.encodeBase64(signature)

    return [base64_signature, signature]
}

async function listTicket(price, keypair, attendeeAccount){
    let b58_signing_sk = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "get_global_secret_key",
        args:{}
    })

    let keypomKey = KeyPair.fromString(b58_signing_sk)

    let keyStore2 = new keyStores.InMemoryKeyStore()
    keyStore2.setKey(network, KEYPOM, keypomKey)

    let nearConfig2 = {
	    networkId: network,
	    keyStore: keyStore2,
	    nodeUrl: `https://rpc.${network}.near.org`,
	    walletUrl: `https://wallet.${network}.near.org`,
	    helperUrl: `https://helper.${network}.near.org`,
	    explorerUrl: `https://explorer.${network}.near.org`,
	};

	let near2 = new Near(nearConfig2);

    let keypomAccount = new Account(near2.connection, KEYPOM);

    let [base64_signature, signature] = await generateSignature(attendeeAccount, keypair)

    console.log("Signature: ", base64_signature)
    console.log("Base 64 version: ", base64_signature)
    console.log("post-sig")
    let msg_json = {
        linkdrop_pk: keypair.publicKey.toString(),
        signature: base64_signature,
        msg:JSON.stringify({
            public_key: keypair.publicKey.toString(),
            price: utils.format.parseNearAmount(price.toString())
        })
    }
    let msg = JSON.stringify(msg_json)
    console.log(typeof msg)
    console.log("pre-nft-approve")
    await keypomAccount.functionCall({
        contractId: KEYPOM, 
        methodName: 'nft_approve', 
        args: {
            account_id: MARKETPLACE,
            msg
        }, 
        gas: "300000000000000",
    })
    console.log("post-nft-approve")
}

async function logBalances(attendeeAccount, fundingAccount){
    let a_balance = (await attendeeAccount.getAccountBalance()).available;
    console.log(`Attendee balance: ${utils.format.formatNearAmount(a_balance.toString())}`)
    let s_balance = (await fundingAccount.getAccountBalance()).available;
    console.log(`Seller balance: ${utils.format.formatNearAmount(s_balance.toString())}`)
}

async function getOwnedTickets(attendeeAccount){
    let owned_tix = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "nft_tokens_for_owner",
        args:{
            account_id: attendeeAccount.accountId
        }
    })
    return owned_tix
}

async function changeMarketplaceMaxMetadataBytes(marketplaceAccount, max){
    await marketplaceAccount.functionCall({
        contractId: MARKETPLACE, 
        methodName: 'change_max_metadata_bytes', 
        args: {
            new_max: max
        }, 
        gas: "300000000000000",
    })

    let read_max_bytes = await marketplaceAccount.viewFunction({
        contractId: MARKETPLACE, 
        methodName: "view_max_metadata_bytes",
        args:{}
    })

    console.log("New max metadata size: ", read_max_bytes)
    console.log("Expected new max metadata size: ", max)
    assert(max == read_max_bytes, "Unexpected new max metadata size")
}

module.exports = {
    buyTickets,
    logBalances,
    getOwnedTickets,
    changeMarketplaceMaxMetadataBytes,
    listTicket,
}