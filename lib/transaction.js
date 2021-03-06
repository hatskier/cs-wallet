'use strict';

var validate = require('./validator');
var feeUtils = require('./fee');
var bitcoin = require('./bitcoin');
var fetchTransactions = require('./api/functions').fetchTransactions;

function createTx(wallet, to, value, fee) {
  if (typeof value === 'string') value = parseInt(value);
  if (typeof fee === 'string') fee = parseInt(fee);

  var network = wallet.network;
  validate.preCreateTx(to, value, network);

  var utxos = wallet.getUnspentsForTx({gap: 1});
  var accum = 0;
  var subTotal = value;

  var builder = new bitcoin.TransactionBuilder(network);

  builder.addOutput(to, value);

  var maxAmount = wallet.maxAmounts.find(function(item) {
    return item.value === value && item.fee === fee;
  });
  if (maxAmount) {
    feeUtils.addCsFee(wallet, builder, maxAmount.csFeeValue);
  } else {
    feeUtils.addCsFee(wallet, builder, value);
  }
  utxos.some(function(unspent) {
    builder.addInputUniversal(wallet, unspent);
    accum += unspent.value;
    subTotal = value + fee;
    if (accum >= subTotal) {
      var change = accum - subTotal;
      if (change > network.dustThreshold) {
        builder.addOutput(wallet.getNextChangeAddress(), change);
      }
      return true;
    }
  });

  validate.postCreateTx({
    needed: value + fee,
    has: accum,
    hasIncludingZeroConf: wallet.getBalance(),
    wallet: wallet,
    builder: builder
  });

  if (wallet.networkName === 'bitcoincash' || wallet.networkName === 'bitcoinsv') {
    var hashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143;
    builder.enableBitcoinCash(true);
    builder.inputs.forEach(function(input, i) {
      builder.sign(i, wallet.getPrivateKeyForAddress(utxos[i].address), null, hashType, utxos[i].value);
    });
  } else {
    builder.inputs.forEach(function(input, i) {
      builder.signUniversal(wallet.getPrivateKeyForAddress(utxos[i].address), i, utxos[i]);
    });
  }

  return builder.build();
}

function sendTx(wallet, tx, done) {
  wallet.api.transactions.propagate(tx.toHex()).then(function() {
    processTx(wallet, tx, done);
  }).catch(done);
}

function processTx(wallet, tx, done) {
  var foundUsed = true;
  while (foundUsed) {
    foundUsed = addToAddresses(wallet.getNextAddress(true), wallet.getNextChangeAddress());
  }

  var allAddresses = wallet.getAllAddresses();

  fetchTransactions(wallet.api, allAddresses, [tx.getId()], wallet.csFeeAddresses).then(function(historyTxs) {
    var historyTx = historyTxs[0];
    if (!historyTx) return done(null, null);
    wallet.balance += historyTx.amount;
    var minusFees = false;
    historyTx.vin.forEach(function(input) {
      wallet.unspents = wallet.unspents.filter(function(unspent) {
        return !(unspent.txId === input.txid && unspent.vout === input.vout);
      });
      if (allAddresses.indexOf(input.addr) !== -1) {
        minusFees = true;
      }
    });
    historyTx.vout.forEach(function(output) {
      if (output.scriptPubKey.addresses && allAddresses.indexOf(output.scriptPubKey.addresses[0]) !== -1) {
        wallet.unspents.push({
          address: output.scriptPubKey.addresses[0],
          type: bitcoin.address.getAddressType(output.scriptPubKey.addresses[0], wallet.network),
          confirmations: historyTx.confirmations,
          txId: historyTx.txId,
          value: output.valueSat,
          vout: output.vout,
        });
      }
    });
    if (minusFees) {
      wallet.balance -= historyTx.fees;
    }
    wallet.maxAmounts = [];
    wallet.maxAmounts = feeUtils.getMaxAmounts(wallet);
    done(null, historyTx);
  }).catch(done);

  function addToAddresses(nextAddress, nextChangeAddress) {
    var found = tx.outs.some(function(out) {
      var address = bitcoin.address.fromOutputScript(out.script, wallet.network).toString();
      var account = wallet.accounts[wallet.addressType];
      if (nextChangeAddress === address) {
        account.changeAddresses.push(address);
        return true;
      } else if (nextAddress === address) {
        account.addresses.push(address);
        return true;
      }
    }, wallet);

    if (found) return true;
  }
}

function createImportTx(wallet, options) {
  var network = wallet.network;
  var builder = new bitcoin.TransactionBuilder(network);
  if (typeof options.fee === 'string') options.fee = parseInt(options.fee);
  var amount = options.amount - options.fee;
  if (amount < 0) {
    throw new Error('Insufficient funds');
  }
  options.unspents.forEach(function(unspent) {
    builder.addInputUniversal(wallet, unspent);
  });
  builder.addOutput(options.to, amount);
  feeUtils.addCsFee(wallet, builder, amount);

  if (wallet.networkName === 'bitcoincash' || wallet.networkName === 'bitcoinsv') {
    var hashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143;
    builder.enableBitcoinCash(true);
    builder.inputs.forEach(function(input, i) {
      builder.sign(i, options.privateKey, null, hashType, options.unspents[i].value);
    });
  } else {
    builder.inputs.forEach(function(input, i) {
      builder.signUniversal(options.privateKey, i, options.unspents[i]);
    });
  }
  return builder.build();
}

function getImportTxOptions(wallet, privateKey) {
  var addresses = wallet.network.addressTypes.map(function(type) {
    return wallet.getAddress(privateKey.getPublicKeyBuffer(), type);
  });
  return wallet.api.addresses.unspents(addresses).then(function(unspents) {
    unspents = wallet.getUnspentsForTx({unspents: unspents});
    var amount = unspents.reduce(function(total, unspent) {
      return total + unspent.value;
    }, 0);
    return {
      privateKey: privateKey,
      unspents: unspents,
      amount: amount
    };
  });
}

module.exports = {
  createTx: createTx,
  sendTx: sendTx,
  createImportTx: createImportTx,
  getImportTxOptions: getImportTxOptions
};
