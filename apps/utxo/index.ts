import { JSON, Ledger, Context } from "@klave/sdk"
import { ERC20UTXO } from "./token/ERC20UTXO/ERC20UTXO"
import { amount, emit } from "./klave/types"
import { CreateInput } from "./klave/ERC20/ERC20RouteArgs";
import { TransferInput, MintInput, BurnInput, PaymentInput } from "./klave/ERC20UTXO/ERC20UTXORouteArgs";
import { TxInput, TxOutput } from "./token/ERC20UTXO/IERC20UTXO";
import { SignInput, sign } from "./klave/crypto";

const ERC20UTXOTable = "ERC20UTXOTable";

const _loadERC20UTXO = function(): ERC20UTXO {
    let erc20utxo_table = Ledger.getTable(ERC20UTXOTable).get("ALL");
    if (erc20utxo_table.length == 0) {
        emit("Coin does not exists. Create it first");
        return new ERC20UTXO("", "", 0, 0);
    }    
    return JSON.parse<ERC20UTXO>(erc20utxo_table);
}

const _saveERC20UTXO = function(erc20utxo : ERC20UTXO): void {
    Ledger.getTable(ERC20UTXOTable).set("ALL", JSON.stringify<ERC20UTXO>(erc20utxo));
}

/** 
 * @transaction 
 * @param {CreateInput} - A parsed input argument containing the name, symbol, decimals and total supply of the currency
 *  */
export function createCoin(input: CreateInput): void {    
    let erc20utxo_table = Ledger.getTable(ERC20UTXOTable).get("ALL");
    if (erc20utxo_table.length != 0) {
        emit("Coin already exists");
        return;
    }
    let erc20utxo = new ERC20UTXO(input.name, input.symbol, input.decimals, input.totalSupply);    
    Ledger.getTable(ERC20UTXOTable).set("ALL", JSON.stringify<ERC20UTXO>(erc20utxo));
    emit("Coin created successfully");
}

/** 
 * @query return name
 *  */
export function name(): void {    
    let erc20utxo = _loadERC20UTXO();
    emit(`Name is ${erc20utxo.name()}`);    
}

/** 
 * @query return symbol
 *  */
export function symbol(): void {    
    let erc20utxo = _loadERC20UTXO();
    emit(`Symbol is ${erc20utxo.symbol()}`);    
}

/** 
 * @query return symbol
 *  */
export function decimals(): void {    
    let erc20utxo = _loadERC20UTXO();
    emit(`Symbol is ${erc20utxo.decimals()}`);    
}

/** 
 * @query return total supply of the currency
 *  */
export function totalSupply(): void {    
    let erc20utxo = _loadERC20UTXO();
    emit(`Total Supply is ${erc20utxo.totalSupply()}`);    
}

/** 
 * @query return balances of the currency
 * @param {string} owner - the address of the owner, takes the sender's address if not provided
 *  */
export function balanceOf(owner: string): void {
    let erc20utxo = _loadERC20UTXO();
    if (owner.length == 0) {
        owner = Context.get('sender');        
    }
    if (!erc20utxo.accountHolder(owner))
        return;
    emit(`Balance for ${owner} is ${erc20utxo.balanceOf(owner)}`);    
}

/** 
 * @transaction 
 * @param {TransferInput} - A parsed input argument containing the "to" address and the value to be paid
 *  */
export function transfer(input: TransferInput): void {
    let erc20utxo = _loadERC20UTXO();
    if (!erc20utxo.accountHolder(Context.get('sender')) || !erc20utxo.accountHolder(input.output.owner))
        return;
    erc20utxo.transfer(input.value, input.input, input.output);
    _saveERC20UTXO(erc20utxo);
}

/**
 * @transaction create new tokens and assign them to the specified address
 * @param {MintInput} - A parsed input argument containing the address of the recipient and the amount of tokens to be created
 */
export function mint(input: MintInput): void {
    let erc20utxo = _loadERC20UTXO();
    if (input.output.owner.length == 0) {
        input.output.owner = Context.get('sender');        
    }
    if (!erc20utxo.accountHolder(input.output.owner)) {
        erc20utxo.createAccount(input.output.owner);
    }        
    erc20utxo.mint(input.amount, input.output, input.data);
    _saveERC20UTXO(erc20utxo);
}

/**
 * @transaction Destroy tokens from the specified address
 * @param {BurnInput} - A parsed input argument containing the address of the sender and the amount of tokens to be destroyed
 */
export function burn(input: BurnInput): void {
    let erc20utxo = _loadERC20UTXO();
    if (input.output.owner.length == 0) {
        input.output.owner = Context.get('sender');
    }
    if (!erc20utxo.accountHolder(input.output.owner)) {
        erc20utxo.createAccount(input.output.owner);
    }        
    erc20utxo.burn(input.amount, input.output, input.data);
    _saveERC20UTXO(erc20utxo);
}

/** 
 * @transaction 
 * @param {PaymentInput} - A parsed input argument containing the "to" address and the value to be paid
 *  */
export function payment(input: PaymentInput): void {
    let erc20utxo = _loadERC20UTXO();
    if (input.payer.length == 0) {
        input.payer = Context.get('sender');
    }
    if (!erc20utxo.accountHolder(input.payer) || !erc20utxo.accountHolder(input.payee))
        return;

    let payer = erc20utxo.account(input.payer);
    let payee = erc20utxo.account(input.payee);

    if (payer.balance < input.value) {
        emit(`Insufficient balance on payer's account - ${payer.owner}`);
        return;    
    }

    let totalTransferred : amount = 0;
    for (let i = 0; i < payer.utxoList.length && totalTransferred < input.value; i++) {
        let toBeTransferred : amount = 0;
        if (payer.utxoList[i].value > (input.value - totalTransferred)) {
            toBeTransferred = input.value - totalTransferred;
        }

        let signInput = new SignInput(payer.owner, payer.utxoList[i].id.toString());
        let txInput = new TxInput(payer.utxoList[i].id, sign(signInput));
        let txOutput = new TxOutput(toBeTransferred, input.payee);
        erc20utxo.transfer(toBeTransferred, txInput, txOutput);        

        totalTransferred += toBeTransferred;
    }
    
    payer.balance -= totalTransferred;
    payee.balance += totalTransferred;

    _saveERC20UTXO(erc20utxo);
}
