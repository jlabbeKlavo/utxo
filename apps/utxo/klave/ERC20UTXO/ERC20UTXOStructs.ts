import {JSON} from "@klave/sdk"
import {address, amount} from "../types"

@serializable
export class UTXO {
    id: number;
    value: amount;

    constructor(id: number, value: amount) {
        this.id = id;
        this.value = value;
    }
}

@serializable
export class Account {        
    owner: address;
    balance: amount;
    utxoList: Array<UTXO>;

    constructor(owner: address, balance: amount) {
        this.owner = owner;
        this.balance = balance;
        this.utxoList = new Array<UTXO>();
    }

    findUTXO(id: number): number {
        for (let i = 0; i < this.utxoList.length; i++) {
            if (this.utxoList[i].id == id) {
                return i;
            }
        }
        return -1;
    }

    addToUTXOList(id: number, value: amount): void {
        let index = this.findUTXO(id);
        if (index != -1) {
            this.utxoList.push(new UTXO(id, value));
        }
    }

    removeFromUTXOList(id: number): void {
        let index = this.findUTXO(id);
        if (index != -1) {
            this.utxoList.splice(index, 1);
        }
    }

    getUTXOvalue(id: number): amount {
        let index = this.findUTXO(id);
        if (index != -1) {
            return this.utxoList[index].value;
        }
        return 0;
    }
}

