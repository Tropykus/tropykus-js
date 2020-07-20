import { ethers } from 'ethers';
import * as eth from './eth';
import { netId } from './helpers';
import { constants, address, abi, cTokens } from './constants';

export async function enterMarkets(markets: any = []) {
  await netId(this);
  const errorPrefix = 'Compound [enterMarkets] | ';

  if (typeof markets === 'string') {
    markets = [ markets ];
  }

  if (!Array.isArray(markets)) {
    throw Error(errorPrefix + 'Argument `markets` must be an array or string.');
  }

  const addresses = [];
  for (let i = 0; i < markets.length; i++) {
    if (markets[i][0] !== 'c') {
      markets[i] = 'c' + markets[i];
    }

    if (!cTokens.includes(markets[i])) {
      throw Error(errorPrefix + 'Provided market `' + markets[i] + '` is not a recognized cToken.');
    }

    addresses.push(address[this._network.name][markets[i]]);
  }

  const comptrollerAddress = address[this._network.name].Comptroller;
  const parameters = [ addresses ];
  const trxOptions: any = {
    _compoundProvider: this._provider,
    abi: abi.Comptroller,
  };

  return eth.trx(comptrollerAddress, 'enterMarkets', parameters, trxOptions);
}

export async function exitMarket(market: string) {
  await netId(this);
  const errorPrefix = 'Compound [exitMarkets] | ';

  if (typeof market !== 'string' || market === '') {
    throw Error(errorPrefix + 'Argument `market` must be a string of a cToken market name.');
  }

  if (market[0] !== 'c') {
    market = 'c' + market;
  }

  if (!cTokens.includes(market)) {
    throw Error(errorPrefix + 'Provided market `' + market + '` is not a recognized cToken.');
  }

  const cTokenAddress = address[this._network.name][market];

  const comptrollerAddress = address[this._network.name].Comptroller;
  const parameters = [ cTokenAddress ];
  const trxOptions: any = {
    _compoundProvider: this._provider,
    abi: abi.Comptroller,
  };

  return eth.trx(comptrollerAddress, 'exitMarket', parameters, trxOptions);
}
