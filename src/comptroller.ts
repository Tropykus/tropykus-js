/**
 * @file Comptroller
 * @desc These methods facilitate interactions with the Comptroller smart
 *     contract. Methods like `claimComp` are in the Governance/COMP section.
 */

import * as eth from "./eth";
import { netId } from "./helpers";
import { address, abi, cTokens } from "./constants";
import { CallOptions, TrxResponse } from "./types";
import { getNetNameWithChainId } from "./util";

type AccountLiquidty = {
	error: number;
	liquidity: number;
	shortfall: number;
};

export async function getAccountLiquidity(
	account: string,
	options: CallOptions = {}
): Promise<AccountLiquidty> {
	await netId(this);
	const errorPrefix = "Compound [getAccountLiquidity] | ";

	if (typeof account !== "string") {
		throw Error(errorPrefix + "Argument `account` must be a string.");
	}

	const comptrollerAddress =
		address[getNetNameWithChainId(this._network.id)].Comptroller;
	const parameters = [account];

	const trxOptions: CallOptions = {
		_compoundProvider: this._provider,
		abi: abi.Comptroller,
		...options,
	};

	const result = await eth.read(
		comptrollerAddress,
		"getAccountLiquidity",
		parameters,
		trxOptions
	);

	return {
		error: Number(result[0]),
		liquidity: Number(result[1]) / 1e18,
		shortfall: Number(result[2]) / 1e18,
	};
}

/**
 * Enters the user's address into Compound Protocol markets.
 *
 * @param {any[]} markets An array of strings of markets to enter, meaning use
 *     those supplied assets as collateral.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if
 *     not supressed) and `mint` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the enterMarkets
 *     transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * (async function () {
 *   const trx = await compound.enterMarkets(Compound.ETH); // Use [] for multiple
 *   console.log('Ethers.js transaction object', trx);
 * })().catch(console.error);
 * ```
 */
export async function enterMarkets(
	markets: string | string[] = [],
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [enterMarkets] | ";

	if (typeof markets === "string") {
		markets = [markets];
	}

	if (!Array.isArray(markets)) {
		throw Error(errorPrefix + "Argument `markets` must be an array or string.");
	}

	const addresses = [];
	for (let i = 0; i < markets.length; i++) {
		if (markets[i][0] !== "c") {
			markets[i] = "c" + markets[i];
		}

		if (!cTokens.includes(markets[i])) {
			throw Error(
				errorPrefix +
					"Provided market `" +
					markets[i] +
					"` is not a recognized cToken."
			);
		}

		addresses.push(
			address[getNetNameWithChainId(this._network.id)][markets[i]]
		);
	}

	const comptrollerAddress =
		address[getNetNameWithChainId(this._network.id)].Comptroller;
	const parameters = [addresses];

	const trxOptions: CallOptions = {
		_compoundProvider: this._provider,
		abi: abi.Comptroller,
		...options,
	};

	return eth.trx(comptrollerAddress, "enterMarkets", parameters, trxOptions);
}

/**
 * Exits the user's address from a Compound Protocol market.
 *
 * @param {string} market A string of the symbol of the market to exit.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if
 *     not supressed) and `mint` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the exitMarket
 *     transaction.
 *
 * @example
 *
 * ```
 * const compound = new Compound(window.ethereum);
 *
 * (async function () {
 *   const trx = await compound.exitMarket(Compound.ETH);
 *   console.log('Ethers.js transaction object', trx);
 * })().catch(console.error);
 * ```
 */
export async function exitMarket(
	market: string,
	options: CallOptions = {}
): Promise<TrxResponse> {
	await netId(this);
	const errorPrefix = "Compound [exitMarket] | ";

	if (typeof market !== "string" || market === "") {
		throw Error(
			errorPrefix +
				"Argument `market` must be a string of a cToken market name."
		);
	}

	if (market[0] !== "c") {
		market = "c" + market;
	}

	if (!cTokens.includes(market)) {
		throw Error(
			errorPrefix +
				"Provided market `" +
				market +
				"` is not a recognized cToken."
		);
	}

	const cTokenAddress =
		address[getNetNameWithChainId(this._network.id)][market];

	const comptrollerAddress =
		address[getNetNameWithChainId(this._network.id)].Comptroller;
	const parameters = [cTokenAddress];

	const trxOptions: CallOptions = {
		_compoundProvider: this._provider,
		abi: abi.Comptroller,
		...options,
	};

	return eth.trx(comptrollerAddress, "exitMarket", parameters, trxOptions);
}
