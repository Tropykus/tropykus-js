/**
 * @file Tropykus
 * @desc This file defines the constructor of the `Tropykus` class.
 * @hidden
 */

import { ethers } from "ethers";
import * as eth from "./eth";
import * as util from "./util";
import * as comptroller from "./comptroller";
import * as cToken from "./cToken";
import * as priceFeed from "./priceFeed";
import * as comp from "./comp";
import * as gov from "./gov";
import * as api from "./api";
import { constants, decimals } from "./constants";
import { Provider, CompoundOptions, CompoundInstance } from "./types";

// Turn off Ethers.js warnings
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

/**
 * Creates an instance of the Tropykus.js SDK.
 *
 * @param {Provider | string} [provider] Optional Ethereum network provider.
 *     Defaults to Ethers.js fallback mainnet provider.
 * @param {object} [options] Optional provider options.
 *
 * @example
 * ```
 * var tropykus = new Tropykus(window.ethereum); // web browser
 *
 * var tropykus = new Tropykus('http://127.0.0.1:8545'); // HTTP provider
 *
 * var tropykus = new Tropykus(); // Uses Ethers.js fallback mainnet (for testing only)
 *
 * var tropykus = new Tropykus('https://public-node.testnet.rsk.co'); // Uses Ethers.js fallback (for testing only)
 *
 * // Init with private key (server side)
 * var tropykus = new Tropykus('https://public-node.rsk.co', {
 *   privateKey: '0x_your_private_key_', // preferably with environment variable
 * });
 *
 * // Init with HD mnemonic (server side)
 * var tropykus = new Tropykus('https://public-node.rsk.co' {
 *   mnemonic: 'clutch captain shoe...', // preferably with environment variable
 * });
 * ```
 *
 * @returns {object} Returns an instance of the Tropykus.js SDK.
 */
const Tropykus = function (
	provider: Provider | string = "https://public-node.rsk.co",
	options: CompoundOptions = {}
): CompoundInstance {
	const originalProvider = provider;

	options.provider = provider || options.provider;
	provider = eth._createProvider(options);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const instance: any = {
		_originalProvider: originalProvider,
		_provider: provider,
		...comptroller,
		...cToken,
		...priceFeed,
		...gov,
		claimComp: comp.claimComp,
		delegate: comp.delegate,
		delegateBySig: comp.delegateBySig,
		createDelegateSignature: comp.createDelegateSignature,
	};

	// Instance needs to know which network the provider connects to, so it can
	//     use the correct contract addresses.
	instance._networkPromise = eth
		.getProviderNetwork(provider)
		.then((network) => {
			delete instance._networkPromise;
			instance._network = network;
		});

	return instance;
};

Tropykus.eth = eth;
Tropykus.api = api;
Tropykus.util = util;
Tropykus._ethers = ethers;
Tropykus.decimals = decimals;
Tropykus.comp = {
	getCompBalance: comp.getCompBalance,
	getCompAccrued: comp.getCompAccrued,
};
Object.assign(Tropykus, constants);

export = Tropykus;
