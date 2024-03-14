import { JSON, Crypto } from "@klave/sdk";
import { convertToBytes, convertToU8Array } from "./helpers";
import { bytes, b64, emit } from "./types";
import { encode as b64encode, decode as b64decode } from 'as-base64/assembly';

@serializable
export class SignInput {
    keyName: string;
    message: string;

    constructor(keyName: string, message: string) {
        this.keyName = keyName;
        this.message = message;
    }
}

@serializable
export class VerifyInput {
    keyName: string;
    message: string;
    signature: b64;

    constructor(keyName: string, message: string, signature: b64) {
        this.keyName = keyName;
        this.message = message;
        this.signature = signature;
    }
}

export function sign(input: SignInput): b64 {
    let signature : b64 = "";
    const key = Crypto.ECDSA.getKey(input.keyName);
    if(key)
    {
        emit(`Signing message: ${input.message} - with key: ${input.keyName}`);
        let signatureU8 = key.sign(input.message);
        if (signatureU8) {
            let signatureBytes = convertToBytes(signatureU8);
            signature = b64encode(signatureBytes);
            emit(`Signature: ${signature}`);            
        }        
    }
    return signature;
}

export function verify(input: VerifyInput): boolean {
    const key = Crypto.ECDSA.getKey(input.keyName);
    if (key) {        
        let signatureAsBytes = b64decode(input.signature);
        return key.verify(input.message, convertToU8Array(signatureAsBytes));
    } 
    return false;
}
