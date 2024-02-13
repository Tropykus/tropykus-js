# Tropykus.js Library

A JavaScript SDK for Ethereum and the Tropykus Protocol. Wraps around [Ethers.js](https://github.com/ethers-io/ethers.js/). Works in the **web browser** and **Node.js**.

[Tropykus.js Documentation](https://compound.finance/docs/compound-js)

This SDK is in **open beta**, and is constantly under development. **USE AT YOUR OWN RISK**.

## Ethereum Read & Write

JSON RPC based Ethereum **read** and **write**.

### Read

```js
const Tropykus = require("@tropykus/tropykus-js"); // in Node.js
const kDOCAddress = Tropykus.util.getAddress(Tropykus.kDOC);

(async function () {
	let supplyRatePerBlock = await Tropykus.eth.read(
		kDOCAddress,
		"function supplyRatePerBlock() returns (uint)",
		[], // [optional] parameters
		{} // [optional] call options, provider, network, ethers.js "overrides"
	);

	console.log("DOC supplyRatePerBlock:", supplyRatePerBlock.toString());
})().catch(console.error);
```

### Write

```js
const toAddress = "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A";

(async function () {
	const trx = await Tropykus.eth.trx(
		toAddress,
		"function send() external payable",
		[],
		{
			value: Tropykus._ethers.utils.parseEther("1.0"), // 1 ETH
			provider: window.ethereum, // in a web browser
		}
	);

	const toAddressEthBalance = await Tropykus.eth.getBalance(toAddress);
})().catch(console.error);
```

## Tropykus Protocol

Simple methods for using the Tropykus protocol.

```js
const tropykus = new Tropykus(window.ethereum); // in a web browser

// Ethers.js overrides are an optional 3rd parameter for `supply`
// const trxOptions = { gasLimit: 250000, mantissa: false };

(async function () {
	console.log("Supplying RBTC to the Tropykus protocol...");
	const trx = await tropykus.supply(Tropykus.RBTC, 1);
	console.log("Ethers.js transaction object", trx);
})().catch(console.error);
```

## Install / Import

Web Browser

```html
<script
	type="text/javascript"
	src="https://cdn.jsdelivr.net/npm/@compound-finance/compound-js@latest/dist/browser/compound.min.js"
></script>

<script type="text/javascript">
	window.Tropykus; // or `Tropykus`
</script>
```

Node.js

```
npm install @tropykus/tropykus-js
```

```js
const Tropykus = require("@tropykus/tropykus-js");

// or, when using ES6

import Tropykus from "@tropykus/tropykus-js";
```

## More Code Examples

See the docblock comments above each function definition or the official [Tropykus.js Documentation](https://compound.finance/docs/compound-js).

## Instance Creation

The following are valid Ethereum providers for initialization of the SDK (v2 and Comet instance).

```js
var tropykus = new Tropykus(window.ethereum); // web browser

var tropykus = new Tropykus('http://127.0.0.1:8545'); // HTTP provider

var tropykus = new Tropykus(); // Uses Ethers.js fallback mainnet (for testing only)

var tropykus = new Tropykus('https://public-node.testnet.rsk.co'); // Uses Ethers.js fallback (for testing only)

// Init with private key (server side)
var tropykus = new Tropykus('https://public-node.rsk.co', {
  privateKey: '0x_your_private_key_', // preferably with environment variable
});

// Init with HD mnemonic (server side)
var tropykus = new Tropykus('https://public-node.rsk.co' {
  mnemonic: 'clutch captain shoe...', // preferably with environment variable
});
```

## Constants and Contract Addresses

Names of contracts, their addresses, ABIs, token decimals, and more can be found in `/src/constants.ts`. Addresses, for all networks, can be easily fetched using the `getAddress` function, combined with contract name constants.

```js
console.log(Tropykus.DOC, Tropykus.BPRO, Tropykus.kRBTC);

const kDOC = Tropykus.util.getAddress(Tropykus.kDOC);
```

## Mantissas

Parameters of number values can be plain numbers or their scaled up mantissa values. There is a transaction option boolean to tell the SDK what the developer is passing.

```js
// 1 Dai
await tropykus.borrow(Tropykus.DOC, "1000000000000000000", { mantissa: true });

// `mantissa` defaults to false if it is not specified or if an options object is not passed
await tropykus.borrow(Tropykus.DOC, 1, { mantissa: false });
```

## Transaction Options

Each method that interacts with the blockchain accepts a final optional parameter for overrides, much like [Ethers.js overrides](https://docs.ethers.io/ethers.js/v5-beta/api-contract.html#overrides).

```js
// The options object itself and all options are optional
const trxOptions = {
	mantissa, // Boolean, parameters array arg of 1 ETH would be '1000000000000000000' (true) vs 1 (false)
	abi, // Definition string or an ABI array from a solc build
	provider, // JSON RPC string, Web3 object, or Ethers.js fallback network (string)
	network, // Ethers.js fallback network provider, "provider" has precedence over "network"
	from, // Address that the Ethereum transaction is send from
	gasPrice, // Ethers.js override `Tropykus._ethers.utils.parseUnits('10.0', 'gwei')`
	gasLimit, // Ethers.js override - see https://docs.ethers.io/ethers.js/v5-beta/api-contract.html#overrides
	value, // Number or string
	data, // Number or string
	chainId, // Number
	nonce, // Number
	privateKey, // String, meant to be used with `Tropykus.eth.trx` (server side)
	mnemonic, // String, meant to be used with `Tropykus.eth.trx` (server side)
};
```

## API

TODO: UPDATE

## Test

Tests are available in `./test/*.test.js`. The tests are configured in `./test/index.js`. Methods are tested using a forked chain using ganache-core. A JSON RPC provider URL needs to be configured as an environment variable before running the tests (`MAINNET_PROVIDER_URL`). Archive state must be available to run the tests. For free archive node access, get a provider URL from [Alchemy](http://alchemy.com/).

```
## Run all tests
npm test

## Run a single test (Mocha JS grep option)
npm test -- -g 'runs eth.getBalance'
```

## Build for Node.js & Web Browser

```
git clone git@github.com:@tropykus/tropykus-js.git
cd tropykus-js/
npm install
npm run build
```

### Web Browser Build

```html
<!-- Local build (do `npm install` first) -->
<script type="text/javascript" src="./dist/browser/tropykus.min.js"></script>

<!-- Public NPM -> jsdeliver build -->
<script
	type="text/javascript"
	src="https://cdn.jsdelivr.net/npm/@tropykus/tropykus-js@latest/dist/browser/tropykus.min.js"
></script>
```

### Node.js Build

```js
// Local build (do `npm install` first)
const Tropykus = require("./dist/nodejs/index.js");

// Public NPM build
const Tropykus = require("@tropykus/tropykus-js");
```
