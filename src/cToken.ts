/**
 * @file Compound.js cToken
 * @desc These methods facilitate interactions with the cToken smart
 *     contracts.
 */

import { ethers } from "ethers";
import * as eth from "./eth";
import { netId } from "./helpers";
import {
	constants,
	address,
	abi,
	decimals,
	underlyings,
	cTokens,
} from "./constants";
import { BigNumber } from "@ethersproject/bignumber/lib/bignumber";
import { CallOptions, TrxResponse } from "./types";
import { getNetNameWithChainId } from "./util";

/**
 * Retrieves the borrow balance of a user for a specific asset.
 *
 * @param asset - The asset symbol.
 * @param userAddress - The user's Ethereum address.
 * @param options - Additional options for the function call.
 * @returns A Promise that resolves to the borrow balance as a BigNumber or number.
 * @throws Throws an error if the asset cannot be borrowed or if the userAddress is not a valid Ethereum address.
 */
export async function getUserBorrows(
	asset: string,
	userAddress: string,
	options: CallOptions = {}
): Promise<BigNumber | number> {
	await netId(this);
	const errorPrefix = "Compound [getUserBorrows] | ";

	const cTokenName = "c" + asset;
	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][cTokenName];

	if (!cTokenAddress || !underlyings.includes(asset)) {
		throw Error(errorPrefix + "Argument `asset` cannot be borrowed.");
	}

	if (!ethers.utils.isAddress(userAddress)) {
		throw Error(
			errorPrefix + "Argument `userAddress` must be a valid Ethereum address."
		);
	}

	options.abi = abi.cErc20;

	const trxOptions: CallOptions = {
		...options,
		_compoundProvider: this._provider,
	};

	const parameters = [userAddress];
	const method = "borrowBalanceStored";

	const result = await eth.read(cTokenAddress, method, parameters, trxOptions);

	if (options.mantissa) {
		return result._hex;
	}
	return Number(result._hex) / Math.pow(10, decimals[asset]);
}

/**
 * Supplies the user's Ethereum asset to the Compound Protocol.
 *
 * @param {string} asset A string of the asset to supply.
 * @param {number | string | BigNumber} amount A string, number, or BigNumber
 *     object of the amount of an asset to supply. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there
 *     are no decimals) or in its natural scale.
 * @param {boolean} noApprove Explicitly prevent this method from attempting an
 *     ERC-20 `approve` transaction prior to sending the `mint` transaction.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if
 *     not supressed) and `mint` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the supply
 *     transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * // Ethers.js overrides are an optional 3rd parameter for `supply`
 * // const trxOptions = { gasLimit: 250000, mantissa: false };
 *
 * (async function() {
 *
 *   console.log('Supplying ETH to the Compound Protocol...');
 *   const trx = await compound.supply(Compound.ETH, 1);
 *   console.log('Ethers.js transaction object', trx);
 *
 * })().catch(console.error);
 * ```
 */
export async function supply(
	asset: string,
	amount: string | number | BigNumber,
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [supply] | ";

	const cTokenName = "c" + asset;

	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][cTokenName];

	if (!cTokenAddress || !underlyings.includes(asset)) {
		throw Error(errorPrefix + "Argument `asset` cannot be supplied.");
	}

	if (
		typeof amount !== "number" &&
		typeof amount !== "string" &&
		!ethers.BigNumber.isBigNumber(amount)
	) {
		throw Error(
			errorPrefix + "Argument `amount` must be a string, number, or BigNumber."
		);
	}

	let userAddress = this._provider.address;

	if (!userAddress && this._provider.getAddress) {
		userAddress = await this._provider.getAddress();
	}

	if (!options.mantissa) {
		amount = amount.toString();
		amount = ethers.utils.parseUnits(amount, decimals[asset]);
	}

	amount = ethers.BigNumber.from(amount.toString());

	if (cTokenName === constants.cETH || cTokenName === constants.cRBTC) {
		options.abi = abi.cEther;
	} else {
		options.abi = abi.cErc20;
	}

	options._compoundProvider = this._provider;

	const borrowBalance = await eth.read(
		cTokenAddress,
		"borrowBalanceStored",
		[userAddress],
		options
	);

	if (borrowBalance.gt(0))
		throw Error(errorPrefix + "User has outstanding borrows");

	if (cTokenName !== constants.cETH && cTokenName !== constants.cRBTC) {
		const underlyingAddress =
			address[getNetNameWithChainId(this._network.id)][asset];
		// Check allowance
		const allowance = await eth.read(
			underlyingAddress,
			"allowance",
			[userAddress, cTokenAddress],
			options
		);

		const notEnough = allowance.lt(amount);

		if (notEnough) {
			// ERC-20 approve transaction
			const approveTx = await eth.trx(
				underlyingAddress,
				"approve",
				[cTokenAddress, amount],
				options
			);
			await approveTx.wait();
		}
	}

	const parameters = [];
	if (cTokenName === constants.cETH || cTokenName === constants.cRBTC) {
		options.value = amount;
	} else {
		parameters.push(amount);
	}

	return eth.trx(cTokenAddress, "mint", parameters, options);
}

/**
 * Redeems the user's Ethereum asset from the Compound Protocol.
 *
 * @param {string} asset A string of the asset to redeem, or its cToken name.
 * @param {number | string | BigNumber} amount A string, number, or BigNumber
 *     object of the amount of an asset to redeem. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there
 *     are no decimals) or in its natural scale. This can be an amount of
 *     cTokens or underlying asset (use the `asset` parameter to specify).
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction.
 *
 * @returns {object} Returns an Ethers.js transaction object of the redeem
 *     transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * (async function() {
 *
 *   console.log('Redeeming ETH...');
 *   const trx = await compound.redeem(Compound.ETH, 1); // also accepts cToken args
 *   console.log('Ethers.js transaction object', trx);
 *
 * })().catch(console.error);
 * ```
 */
export async function redeem(
	asset: string,
	amount: string | number | BigNumber,
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [redeem] | ";

	if (typeof asset !== "string" || asset.length < 1) {
		throw Error(errorPrefix + "Argument `asset` must be a non-empty string.");
	}

	const assetIsCToken = asset[0] === "c";

	const cTokenName = assetIsCToken ? asset : "c" + asset;
	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][cTokenName];

	const underlyingName = assetIsCToken ? asset.slice(1, asset.length) : asset;

	if (!cTokens.includes(cTokenName) || !underlyings.includes(underlyingName)) {
		throw Error(errorPrefix + "Argument `asset` is not supported.");
	}

	if (
		typeof amount !== "number" &&
		typeof amount !== "string" &&
		!ethers.BigNumber.isBigNumber(amount)
	) {
		throw Error(
			errorPrefix + "Argument `amount` must be a string, number, or BigNumber."
		);
	}

	if (!options.mantissa) {
		amount = amount.toString();
		amount = ethers.utils.parseUnits(amount, decimals[asset]);
	}

	amount = ethers.BigNumber.from(amount.toString());

	const trxOptions: CallOptions = {
		...options,
		_compoundProvider: this._provider,
		abi: cTokenName === constants.cETH ? abi.cEther : abi.cErc20,
	};
	const parameters = [amount];
	let method;
	let userAddress = this._provider.address;

	if (!userAddress && this._provider.getAddress) {
		userAddress = await this._provider.getAddress();
	}
	if (assetIsCToken) {
		// CHeck balance of cToken
		method = "redeem";
		const cTokenBalance = await eth.read(
			cTokenAddress,
			"balanceOf",
			[userAddress],
			trxOptions
		);
		if (amount.gt(cTokenBalance))
			throw Error(errorPrefix + "Trying to redeem more than supplied");
	} else {
		method = "redeemUnderlying";
		const underlyingBalance = await eth.read(
			cTokenAddress,
			"balanceOfUnderlying",
			[userAddress],
			trxOptions
		);
		if (amount.gt(underlyingBalance))
			throw Error(errorPrefix + "Trying to redeem more than supplied");
	}

	return eth.trx(cTokenAddress, method, parameters, trxOptions);
}

/**
 * Borrows an Ethereum asset from the Compound Protocol for the user. The user's
 *     address must first have supplied collateral and entered a corresponding
 *     market.
 *
 * @param {string} asset A string of the asset to borrow (must be a supported
 *     underlying asset).
 * @param {number | string | BigNumber} amount A string, number, or BigNumber
 *     object of the amount of an asset to borrow. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there
 *     are no decimals) or in its natural scale.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction.
 *
 * @returns {object} Returns an Ethers.js transaction object of the borrow
 *     transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * (async function() {
 *
 *   const daiScaledUp = '32000000000000000000';
 *   const trxOptions = { mantissa: true };
 *
 *   console.log('Borrowing 32 Dai...');
 *   const trx = await compound.borrow(Compound.DAI, daiScaledUp, trxOptions);
 *
 *   console.log('Ethers.js transaction object', trx);
 *
 * })().catch(console.error);
 * ```
 */
export async function borrow(
	asset: string,
	amount: string | number | BigNumber,
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [borrow] | ";

	const cTokenName = "c" + asset;
	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][cTokenName];

	if (!cTokenAddress || !underlyings.includes(asset)) {
		throw Error(errorPrefix + "Argument `asset` cannot be borrowed.");
	}

	if (
		typeof amount !== "number" &&
		typeof amount !== "string" &&
		!ethers.BigNumber.isBigNumber(amount)
	) {
		throw Error(
			errorPrefix + "Argument `amount` must be a string, number, or BigNumber."
		);
	}

	if (!options.mantissa) {
		amount = amount.toString();
		amount = ethers.utils.parseUnits(amount, decimals[asset]);
	}

	amount = ethers.BigNumber.from(amount.toString());

	let userAddress = this._provider.address;

	if (!userAddress && this._provider.getAddress) {
		userAddress = await this._provider.getAddress();
	}

	const comptrollerAddress =
		address[getNetNameWithChainId(this._network.id)].Comptroller;

	const compCallOptions: CallOptions = {
		_compoundProvider: this._provider,
		abi: abi.Comptroller,
		...options,
	};

	const accountLiquidity = await eth.read(
		comptrollerAddress,
		"getAccountLiquidity",
		[userAddress],
		compCallOptions
	);
	if (accountLiquidity[2].gt(0))
		throw Error(errorPrefix + "User is in liquidation zone");
	if (accountLiquidity[1].lt(amount))
		throw Error(errorPrefix + "Insufficient collateral");

	const trxOptions: CallOptions = {
		...options,
		_compoundProvider: this._provider,
	};
	const parameters = [amount];
	trxOptions.abi = cTokenName === constants.cETH ? abi.cEther : abi.cErc20;

	return eth.trx(cTokenAddress, "borrow", parameters, trxOptions);
}

/**
 * Repays a borrowed Ethereum asset for the user or on behalf of another
 *     Ethereum address.
 *
 * @param {string} asset A string of the asset that was borrowed (must be a
 *     supported underlying asset).
 * @param {number | string | BigNumber} amount A string, number, or BigNumber
 *     object of the amount of an asset to borrow. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there
 *     are no decimals) or in its natural scale. If the number is -1 it will repay all the borrow.
 * @param {string | null} [borrower] The Ethereum address of the borrower to
 *     repay an open borrow for. Set this to `null` if the user is repaying
 *     their own borrow.
 * @param {boolean} noApprove Explicitly prevent this method from attempting an
 *     ERC-20 `approve` transaction prior to sending the subsequent repayment
 *     transaction.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if
 *     not supressed) and `repayBorrow` or `repayBorrowBehalf` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the repayBorrow
 *     or repayBorrowBehalf transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * (async function() {
 *
 *   console.log('Repaying Dai borrow...');
 *   const address = null; // set this to any address to repayBorrowBehalf
 *   const trx = await compound.repayBorrow(Compound.DAI, 32, address);
 *
 *   console.log('Ethers.js transaction object', trx);
 *
 * })().catch(console.error);
 * ```
 */

export async function repayBorrow(
	asset: string,
	amount: string | number | BigNumber,
	borrower: string,
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [repayBorrow] | ";

	const cTokenName = "c" + asset;
	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][cTokenName];

	if (!cTokenAddress || !underlyings.includes(asset)) {
		throw Error(errorPrefix + "Argument `asset` is not supported.");
	}

	if (
		typeof amount !== "number" &&
		typeof amount !== "string" &&
		!ethers.BigNumber.isBigNumber(amount)
	) {
		throw Error(
			errorPrefix + "Argument `amount` must be a string, number, or BigNumber."
		);
	}

	const method = ethers.utils.isAddress(borrower)
		? "repayBorrowBehalf"
		: "repayBorrow";
	if (borrower && method === "repayBorrow") {
		throw Error(errorPrefix + "Invalid `borrower` address.");
	}

	let userAddress = this._provider.address;

	if (!userAddress && this._provider.getAddress) {
		userAddress = await this._provider.getAddress();
	}

	const inputAmount = amount;

	if (!options.mantissa) {
		amount = amount.toString();
		amount = ethers.utils.parseUnits(amount, decimals[asset]);
	}
	amount = ethers.BigNumber.from(amount.toString());
	const trxOptions: CallOptions = {
		...options,
		_compoundProvider: this._provider,
		abi: abi.cErc20,
	};

	const borrowBalance = await eth.read(
		cTokenAddress,
		"borrowBalanceStored",
		[userAddress],
		trxOptions
	);

	let approvalValue = amount;

	if (inputAmount.toString() === "-1") {
		amount = ethers.constants.MaxUint256;
		approvalValue = borrowBalance.add(1);
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const parameters: any[] = method === "repayBorrowBehalf" ? [borrower] : [];
	if (cTokenName === constants.cETH || cTokenName === constants.cRBTC) {
		trxOptions.value = amount;
		trxOptions.abi = abi.cEther;
	} else {
		parameters.push(amount);
	}

	if (cTokenName !== constants.cETH && cTokenName !== constants.cRBTC) {
		const underlyingAddress =
			address[getNetNameWithChainId(this._network.id)][asset];
		// Check allowance
		const allowance = await eth.read(
			underlyingAddress,
			"allowance",
			[userAddress, cTokenAddress],
			trxOptions
		);

		const notEnough = allowance.lt(approvalValue);

		if (notEnough) {
			// ERC-20 approve transaction
			const approvalTx = await eth.trx(
				underlyingAddress,
				"approve",
				[cTokenAddress, approvalValue],
				trxOptions
			);
			approvalTx.wait();
		}
	}

	return eth.trx(cTokenAddress, method, parameters, trxOptions);
}
