const { initKeypom, createDrop, getEnv, formatLinkdropUrl, getPubFromSecret, getKeyInformation, generateKeys } = require("@keypom/core"); 
const { parseNearAmount, formatNearAmount } = require("@near-js/utils");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");

//const { KeyStore, InMemoryKeyStore } = require("@near-js/keystores");
const { InMemoryKeyStore} = require("near-api-js")
const { Near } = require("@near-js/wallet-account");
const { Account } = require("@near-js/accounts");
const signer = require('nacl-signature');
const bs58 = require('bs58');
const path = require("path");
const { assert } = require("console");
const { KeyPair } = require("@near-js/crypto");
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
    let ticket_key = await generateKeys({numKeys});
    
    let new_keys = []  
    for(let key of ticket_key.publicKeys){
        new_keys.push({
            public_key: key,
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
            new_keys,
        }, 
        gas: "300000000000000",
        attachedDeposit: parseNearAmount(attached_deposit.toString())
    })

    return new_keys
}

//async function buyResale()

async function testSignature(attendeeAccount){
    // Example usage
    const secretKey = "Zo8dtg13eVB8rpg7zFGvLkPBob6eZx7D9LTxX9WjtUAnQLF2Ksv4pVwQ1GczhtB3jWM1a6LE2qE233mRYAHZP5N";
    const publicKey = "3BNLBGiWD15bpxWZKvM5PUCmo5Xk6bd8gBHhbMNSAokg";

    const sk_bytes = bs58.decode(secretKey);
    const pk_bytes = bs58.decode(publicKey);

    const sk_64 = Buffer.from(sk_bytes).toString('base64');
    const pk_64 = Buffer.from(pk_bytes).toString('base64');

    try{
        const signature = signer.sign("Hello, world!", sk_64);
        console.log(signature);
        console.log(signer.verify("Hello, world!", signature, pk_64));
    }catch(e){
        console.log(e)
    }
}

async function generateKeypomSignature(attendeeAccount, publicKey, b58_signing_sk){

    let sk_bytes = bs58.decode(b58_signing_sk)
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
            key: publicKey
        }
    })
    let message_nonce = key_info.message_nonce

    let message = signing_message + message_nonce

    const signature = signer.sign(message, secret_key);

    return signature
}

async function testKeypomSign(attendeeAccount){
     // Get contract sk, signing message, and key message nonce, then generate signature

     let b58_signing_sk = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "get_global_secret_key",
        args:{}
    })

    let keys = KeyPair.fromString("ed25519:" + b58_signing_sk)

    console.log(keys)
    
    // create keypom account instance using above keypair, then sign nft_approve using it!!!
    const keypomAccount = new Account(attendeeAccount.connection, KEYPOM);
    
    const inMemoryKeyStore = new InMemoryKeyStore()
    inMemoryKeyStore.setKey(keypomAccount.networkId, keypomAccount.accountId, keys)
}

async function listTicket(price, publicKey, attendeeAccount){
    let b58_signing_sk = await attendeeAccount.viewFunction({
        contractId: KEYPOM, 
        methodName: "get_global_secret_key",
        args:{}
    })
    let keypomKey = KeyPair.fromString("ed25519:" + b58_signing_sk)

    let keyStore2 = new InMemoryKeyStore()
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

    let signature = await generateKeypomSignature(attendeeAccount, publicKey, b58_signing_sk)

    console.log(signature)
    let msg_json = {
        linkdrop_pk: publicKey,
        signature,
        msg:JSON.stringify({
            public_key: publicKey,
            price: parseNearAmount(price.toString())
        })
    }
    
    await keypomAccount.functionCall({
        contractId: KEYPOM, 
        methodName: 'nft_approve', 
        args: {
            account_id: MARKETPLACE,
            msg: JSON.stringify(msg_json)
        }, 
        gas: "300000000000000",
        attachedDeposit: parseNearAmount("1")
    })
}

async function logBalances(attendeeAccount, fundingAccount){
    let a_balance = (await attendeeAccount.getAccountBalance()).available;
    console.log(`Attendee balance: ${formatNearAmount(a_balance.toString())}`)
    let s_balance = (await fundingAccount.getAccountBalance()).available;
    console.log(`Seller balance: ${formatNearAmount(s_balance.toString())}`)
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
    testSignature,
    testKeypomSign
}