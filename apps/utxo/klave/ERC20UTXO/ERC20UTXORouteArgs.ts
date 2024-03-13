import { JSON } from "@klave/sdk"
import { TxInput, TxOutput } from "../../token/ERC20UTXO/IERC20UTXO";
import { amount, bytes } from "../../klave/types";

@serializable
export class TransferInput {    
    value!: amount;
    input!: TxInput;    
    output!: TxOutput;

    constructor(value: amount, input: TxInput, output: TxOutput) {
        this.value = value;
        this.input = new TxInput(input.id, input.signature);
        this.output = new TxOutput(output.amount, output.owner);
    }
}

@serializable
export class MintInput {
    amount!: amount;
    output!: TxOutput; 
    data!: bytes;

    constructor(amount: amount, output: TxOutput, data: bytes) {
        this.amount = amount;
        this.output = new TxOutput(amount, output.owner);
        this.data = data;
    }
}

@serializable
export class BurnInput {
    amount!: amount;
    output!: TxOutput;
    data!: bytes;
    
    constructor(amount: amount, output: TxOutput, data: bytes) {
        this.amount = amount;
        this.output = new TxOutput(amount, output.owner);
        this.data = data;
    }
}