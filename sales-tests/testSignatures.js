// import { Buffer } from 'node:buffer';
// import * as ed25519 from '@noble/ed25519';

// const { sign, verify } = require('tweetnacl');
// const { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } = require('tweetnacl-util');
const { sign } = require('crypto');
const signer = require('nacl-signature');
const bs58 = require('bs58');
// Function to sign a message using the secret key


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


// async function testSignature(){
//     try {
//         // Assuming getPubFromSecret is defined elsewhere
//         let signing_sk = "Zo8dtg13eVB8rpg7zFGvLkPBob6eZx7D9LTxX9WjtUAnQLF2Ksv4pVwQ1GczhtB3jWM1a6LE2qE233mRYAHZP5N"

//         console.log(signing_sk);

//         let signing_pk = "ed25519:3BNLBGiWD15bpxWZKvM5PUCmo5Xk6bd8gBHhbMNSAokg";

//         // Decode the hex-encoded secret key
//         let sk = new Uint8Array(Buffer.from(signing_sk, 'base64'));
        

//         // Decode the hex-encoded public key
//         let pk = new Uint8Array(Buffer.from(signing_pk.split(':')[1], 'base64'));

        
//         // Message to be signed
//         const message_string = 'Hello, world!'.toString();
//         const message = new Uint8Array(Buffer.from(message_string));

//         console.log(sk)
//         console.log(pk)
//         console.log(message)

//         console.log(sk)

//         // Sign the message using the private key
//         const signature = ed25519.signAsync(message_string, signing_sk);

//         // Verify the signature using the public key
//         const verified = ed25519.verifyAsync(signature, message_string, signing_pk);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// testSignature();