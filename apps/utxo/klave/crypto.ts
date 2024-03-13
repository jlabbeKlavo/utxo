import { JSON, Crypto } from "@klave/sdk";
import { convertToUint8Array, convertToU8Array } from "./helpers";

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
    signature: Uint8Array;

    constructor(keyName: string, message: string, signature: Uint8Array) {
        this.keyName = keyName;
        this.message = message;
        this.signature = signature;
    }
}

export function sign(input: SignInput): Uint8Array {
    let signature = new Uint8Array;
    const key = Crypto.ECDSA.getKey(input.keyName);
    if(key)
    {
        signature = convertToUint8Array(key.sign(input.message));
    }
    return signature;
}

export function verify(input: VerifyInput): boolean {
    const key = Crypto.ECDSA.getKey(input.keyName);
    if (key) {        
        return key.verify(input.message, convertToU8Array(input.signature));
    } 
    return false;
}
