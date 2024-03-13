import {JSON} from "@klave/sdk"
import {address, amount, index} from "../types"

@serializable
export class UTXO {
    id: index;
    value: amount;

    constructor(id: index, value: amount) {
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

    findUTXO(id: index): index {
        for (let i = 0; i < this.utxoList.length; i++) {
            if (this.utxoList[i].id == id) {
                return i;
            }
        }
        return -1;
    }

    addToUTXOList(id: index, value: amount): void {
        let index = this.findUTXO(id);
        if (index != -1) {
            this.utxoList.push(new UTXO(id, value));
        }
    }

    removeFromUTXOList(id: index): void {
        let index = this.findUTXO(id);
        if (index != -1) {
            this.utxoList.splice(index, 1);
        }
    }

    getUTXOvalue(id: index): amount {
        let index = this.findUTXO(id);
        if (index != -1) {
            return this.utxoList[index].value;
        }
        return 0;
    }
}

