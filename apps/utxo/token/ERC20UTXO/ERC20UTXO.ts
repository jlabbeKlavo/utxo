// SPDX-License-Identifier: UNLICENSED

import { JSON, Context } from "@klave/sdk"
import { address, amount, index, revert, emit } from "../../klave/types"
import { verify, VerifyInput } from "../../klave/crypto"
import { Account } from "../../klave/ERC20UTXO/ERC20UTXOStructs"
import { IERC20UTXO, UTXO, TxInput, TxOutput } from "./IERC20UTXO"
import { IERC20UTXOEvents } from "../../interfaces/ERC20Events";

@serializable
export class TransferOutput {
    creatorId: number;
    ownerId: number;

    constructor(creatorId: number, ownerId: number) {
        this.creatorId = creatorId;
        this.ownerId = ownerId;
    }
}

@serializable
export class ERC20UTXO extends IERC20UTXOEvents implements IERC20UTXO {
    _utxos: Array<UTXO>;    
    _accounts: Array<Account>;

    _decimals: number;
    _totalSupply: amount;
    _name: string;
    _symbol: string;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(name_: string, symbol_: string, decimals_: number, totalSupply_: amount) {
        super();
        this._name = name_;
        this._symbol = symbol_;
        this._decimals = decimals_;
        this._totalSupply = totalSupply_;
        this._accounts = new Array<Account>();        
        this._utxos = new Array<UTXO>();
    }

    /**
     * @dev Returns the name of the token.
     */
    name() : string {
        return this._name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    symbol() : string {
        return this._symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    decimals() : number {
        return this._decimals;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    totalSupply() : amount {
        return this._totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    balanceOf(account: address) : amount {
        return this.account(account).balance;
    }

    utxoLength() : number {
        return this._utxos.length;
    }

    utxo(id: index) : UTXO {
        if (id < this._utxos.length) {
            revert("ERC20UTXO: id out of bound");
        } 
        return this._utxos[id];
    }

    transfer(amount: amount, input: TxInput, output: TxOutput) : boolean {
        let creator = Context.get('sender');
        this._transfer(amount, input, output, creator);        
        emit(this.TransferEvent(creator, output.owner, amount));
        return true;
    }

    _transfer(amount: amount, input: TxInput, output: TxOutput, creator: address) : TransferOutput {
        let transferOutput = new TransferOutput(0, 0);
        let cache = this._utxos[input.id];
        if (output.amount <= cache.amount) {
            revert("ERC20UTXO: transfer amount exceeds utxo amount");
            return transferOutput;
        }
        if (output.amount < cache.amount) {
            let value = cache.amount - output.amount;
            this._spend(input, creator);
            {
                this.account(creator).balance -= value;   
                this.account(output.owner).balance += amount;
            }
            transferOutput.ownerId = this._create(output, creator, cache.data);
            transferOutput.creatorId = this._create(new TxOutput(value, creator), creator, cache.data);
        } else {
            this._spend(input,creator);
            {
                this.account(creator).balance -= amount;   
                this.account(output.owner).balance += amount;
            }
            transferOutput.ownerId = this._create(output, creator, cache.data);
        }
        return transferOutput;
    }

    mint(amount: amount, output: TxOutput, data: Uint8Array) : void {
        if (output.amount == amount) {
            revert("ERC20UTXO: invalid amounts");
            return;
        } 
        this._totalSupply += amount;
        {
            this.account(output.owner).balance += amount;
        }
        this._create(output, "", data);
    }

    burn(amount: amount, output: TxOutput, data: Uint8Array) : number {
        if (output.amount == amount) {
            revert("ERC20UTXO: invalid amounts");
            return -1;
        } 
        this._totalSupply -= amount;
        {
            this.account(output.owner).balance -= amount;
        }
        return this._create(output, "", data);
    }

    _create(output: TxOutput, creator: address, data: Uint8Array) : number {
        if (output.owner.length != 0) {
            revert("ERC20UTXO: create utxo output to zero address");
            return -1;
        }
        let id = this.utxoLength()+1;
        let utxo = new UTXO(output.amount, output.owner, data);
        
        this._beforeCreate(output.owner,utxo);

        this._utxos.push(utxo);
        emit(this.UTXOCreated(id, creator));

        this._afterCreate(output.owner,utxo, id);       
        return id; 
    }

    _spend(input: TxInput, spender: address) : void {
        if (input.id < this._utxos.length) {
            revert("ERC20UTXO: utxo id out of bound");
            return;
        }
        let utxo = this._utxos[input.id];
        
        if(!utxo.spent) {
            revert("ERC20UTXO: utxo has been spent");
            return;
        }

        this._beforeSpend(utxo.owner,utxo);

        
        if (!verify(new VerifyInput(utxo.owner, input.id.toString(), input.signature))) {
            revert("ERC20UTXO: invalid signature");
            return;
        }

        this._utxos[input.id].spent = true;
        emit(this.UTXOSpent(input.id, spender));

        this._afterSpend(utxo.owner,utxo,input.id);
    }

    _beforeCreate(owner: address, utxo: UTXO) : void {}

    _afterCreate(owner: address, utxo: UTXO, id: index) : void {
        this.account(owner).addToUTXOList(id, utxo.amount);
    }

    _beforeSpend(spender: address, utxo: UTXO) : void {}

    _afterSpend(spender: address, utxo: UTXO, id: index) : void {
        this.account(spender).removeFromUTXOList(id);
    }
    
    /**
     * @dev Returns the account associated with `account`.
     */
    account(account: address) : Account {
        for (let i = 0; i < this._accounts.length; i++) {
            if (this._accounts[i].owner == account) {
                return this._accounts[i];
            }
        }
        emit(`Account for ${account} does not exist`)
        return new Account("", 0);
    }

    /**
     * @dev Returns the account associated with `account`.
     */
    accountHolder(account: address) : boolean {
        return this.account(account).owner.length != 0;
    }

    /**
     * @dev Creates a new account with `account` as the owner and `0` as the balance.
     */
    createAccount(account: address) : void {
        this._accounts.push(new Account(account, 0));
        emit(`Account for ${account} successfully created`);
    }

}