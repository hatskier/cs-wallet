'use strict';

var assert = require('assert');
var sinon = require('sinon');
var async = require('async');
var Wallet = require('../');
var bitcoin = Wallet.bitcoin;
var Transaction = bitcoin.Transaction;
var TransactionBuilder = bitcoin.TransactionBuilder;
var Address = bitcoin.address;
var network = bitcoin.networks.bitcoin;
var fixtures = require('./wallet');
var addressFixtures = require('./addresses');
var transactionsFixtures = require('./transactions');
var wif = require('wif');
var BigInteger = require('bigi');

describe('Common Blockchain Wallet', function() {

  describe('non-network dependent tests', function() {
    var readOnlyWallet;
    var addresses = addressFixtures.addresses;
    var changeAddresses = addressFixtures.changeAddresses;
    var sandbox = sinon.createSandbox();

    before(function() {
      // this should be treated as a convenient read-only wallet
      readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
    });

    afterEach(function(){
      sandbox.restore();
    });

    describe('getBalance', function() {
      it('works', function() {
        assert.equal(readOnlyWallet.getBalance(), 0);
      });

      it('calculates it correctly when one of the head transactions has value 0', function(done) {
        var myWallet = Wallet.deserialize(JSON.stringify(fixtures));

        sandbox.stub(myWallet.api.transactions, 'get').resolves([transactionsFixtures.fundedAddressZero]);

        fundAddressZero(myWallet, function(err, fundingTx) {
          if (err) return done(err);

          myWallet.api.transactions.get.restore();
          sandbox.stub(myWallet.api.transactions, 'get').resolves([transactionsFixtures.fundedChangeAddress]);

          var tx = new Transaction();
          tx.addInput(fundingTx.getHash(), 0);
          tx.addOutput(Address.toOutputScript(myWallet.accounts.p2pkh.changeAddresses[0], network), 200000);

          sandbox.stub(myWallet.api.transactions, 'propagate').resolves();
          myWallet.sendTx(tx, function(err) {
            myWallet.api.transactions.propagate.restore();
            if (err) return done(err);

            assert.equal(myWallet.getBalance(), 200000);
            done();
          });
        });
      });

      function fundAddressZero(wallet, done) {
        var tx = new Transaction();
        tx.addInput((new Transaction()).getHash(), 0);
        tx.addOutput(Address.toOutputScript(wallet.accounts.p2pkh.addresses[0], network), 200000);

        sandbox.stub(wallet.api.transactions, 'propagate').resolves();
        wallet.sendTx(tx, function(err) {
          wallet.api.transactions.propagate.restore();
          if (err) return done(err);
          done(null, tx);
        });
      }
    });

    describe('getNextAddress', function() {
      it('works', function() {
        assert.deepEqual(readOnlyWallet.getNextAddress(true), 'mr7dXSfei5TQPmkJhA6cLmrwnhihaqbCUy');
      });
    });

    describe('getNextChangeAddress', function() {
      it('works', function() {
        assert.deepEqual(readOnlyWallet.getNextChangeAddress(), 'mm1Y2FNfKCvvP6e67wyyxBoQkkwWXyJmDB');
      });
    });

    describe('getPrivateKeyForAddress', function(){
      it('returns the private key for the given address', function(){
        assert.equal(
          readOnlyWallet.getPrivateKeyForAddress(addresses[1]).toWIF(),
          wif.encode(network.wif, readOnlyWallet.accounts.p2pkh.external.deriveChild(1).privateKey, true)
        );
        assert.equal(
          readOnlyWallet.getPrivateKeyForAddress(changeAddresses[0]).toWIF(),
          wif.encode(network.wif, readOnlyWallet.accounts.p2pkh.internal.deriveChild(0).privateKey, true)
        );
      });

      it('raises an error when address is not found', function(){
        assert.throws(function() {
          readOnlyWallet.getPrivateKeyForAddress(changeAddresses[changeAddresses.length]);
        }, /Unknown address. Make sure the address is from the keychain and has been generated./);
      });
    });

    describe('processTx', function() {
      var tx, prevTx, externalAddress, myWallet, nextAddress, nextChangeAddress;

      before(function(done) {
        externalAddress = 'mh8evwuteapNy7QgSDWeUXTGvFb4mN1qvs';
        myWallet = Wallet.deserialize(JSON.stringify(fixtures));
        nextAddress = myWallet.getNextAddress(true);

        nextChangeAddress = myWallet.getNextChangeAddress();

        prevTx = new Transaction();
        prevTx.addInput((new Transaction()).getHash(), 0);
        prevTx.addOutput(Address.toOutputScript(nextAddress, network), 200000);

        tx = new Transaction();
        tx.addInput((new Transaction()).getHash(), 0);
        tx.addOutput(Address.toOutputScript(externalAddress, network), 50000);
        tx.addOutput(Address.toOutputScript(nextChangeAddress, network), 130000);

        sandbox.stub(myWallet.api.transactions, 'get').resolves([transactionsFixtures.fundedAddressZero]);

        sandbox.stub(myWallet.api.transactions, 'propagate').resolves();
        async.series([
          function(cb) { myWallet.sendTx(prevTx, cb);},
          function(cb) { myWallet.sendTx(tx, cb);}
        ], function(err) {
          myWallet.api.transactions.propagate.restore();
          myWallet.api.transactions.get.restore();
          done(err);
        });
      });

      describe('address derivation', function() {
        var myWalletSnapshot;
        before(function() {
          myWalletSnapshot = myWallet.serialize();
        });

        after(function() {
          myWallet = Wallet.deserialize(myWalletSnapshot);
        });

        it('adds the next change address to changeAddresses if the it is used to receive funds', function() {
          var expected = myWallet.accounts.p2pkh.changeAddresses.length - 1;
          assert.equal(myWallet.accounts.p2pkh.changeAddresses.indexOf(nextChangeAddress), expected);
        });

        it('adds the next address to addresses if the it is used to receive funds', function() {
          var expected = myWallet.accounts.p2pkh.addresses.length - 1;
          assert.equal(myWallet.accounts.p2pkh.addresses.indexOf(nextAddress), expected);
        });

        it('does not add the same address more than once', function(done) {
          sandbox.stub(myWallet.api.transactions, 'get').resolves([transactionsFixtures.fundedAddressZero]);
          var nextNextAddress = myWallet.getNextAddress(true);

          var aTx = new Transaction();
          aTx.addInput((new Transaction()).getHash(), 1);
          aTx.addOutput(Address.toOutputScript(myWallet.getNextAddress(true), network), 200000);

          var bTx = new Transaction();
          bTx.addInput((new Transaction()).getHash(), 2);
          bTx.addOutput(Address.toOutputScript(myWallet.getNextAddress(true), network), 200000);

          sandbox.stub(myWallet.api.transactions, 'propagate').resolves();
          async.series([
            function(cb) { myWallet.sendTx(aTx, cb);},
            function(cb) { myWallet.sendTx(bTx, cb);}
          ], function(err) {
            myWallet.api.transactions.propagate.restore();
            if (err) return done(err);
            var addresses = myWallet.accounts.p2pkh.addresses;
            assert.equal(addresses.indexOf(nextNextAddress), addresses.length - 1);
            done();
          });
        });
      });
    });

    describe('createTx', function() {
      var to, value, address1, address2, unspentTxs;

      before(function() {
        to = 'mh8evwuteapNy7QgSDWeUXTGvFb4mN1qvs';
        value = 500000;

        unspentTxs = [];

        address1 = readOnlyWallet.accounts.p2pkh.addresses[0];
        address2 = readOnlyWallet.accounts.p2pkh.changeAddresses[0];

        var pair0 = createTxPair(address1, 400000); // not enough for value
        unspentTxs.push(pair0.tx);

        var pair1 = createTxPair(address1, 500000); // not enough for only value
        unspentTxs.push(pair1.tx);

        var pair2 = createTxPair(address2, 510000); // enough for value and fee
        unspentTxs.push(pair2.tx);

        var pair3 = createTxPair(address2, 520000); // enough for value and fee
        unspentTxs.push(pair3.tx);

        function createTxPair(address, amount) {
          var prevTx = new Transaction();
          prevTx.addInput((new Transaction()).getHash(), 0);
          prevTx.addOutput(Address.toOutputScript(to, network), amount);

          var tx = new Transaction();
          tx.addInput(prevTx.getHash(), 0);
          tx.addOutput(Address.toOutputScript(address, network), amount);

          return { prevTx: prevTx, tx: tx };
        }
      });

      describe('transaction outputs', function(){
        it('includes the specified address and amount', function(){
          var tx = readOnlyWallet.createTx(to, value, 0);

          assert.equal(tx.outs.length, 2);
          var out = tx.outs[0];
          var outAddress = Address.fromOutputScript(out.script, network);

          assert.equal(outAddress.toString(), to);
          assert.equal(out.value, value);
        });

        describe('change', function(){
          it('uses the next change address', function(){
            var fee = 0;
            var tx = readOnlyWallet.createTx(to, value, fee);

            assert.equal(tx.outs.length, 2);
            var out = tx.outs[1];
            var outAddress = Address.fromOutputScript(out.script, network);

            assert.equal(outAddress.toString(), readOnlyWallet.getNextChangeAddress());
            assert.equal(out.value, 10000);
          });

          it('skips change if it is not above dust threshold', function(){
            var fee = 9454;
            var tx = readOnlyWallet.createTx(to, value, fee);
            assert.equal(tx.outs.length, 1);
          });
        });
      });

      describe('choosing utxo', function(){
        it('takes fees into account', function(){
          var tx = readOnlyWallet.createTx(to, value, 0);

          assert.equal(tx.ins.length, 1);
          assert.deepEqual(tx.ins[0].hash, unspentTxs[2].getHash());
          assert.equal(tx.ins[0].index, 0);
        });
      });

      describe('transaction fee', function(){
        it('allows fee to be specified', function(){
          var fee = 30000;
          var tx = readOnlyWallet.createTx(to, value, fee);

          assert.equal(getFee(tx), fee);
        });

        it('allows fee to be set to zero', function(){
          value = 510000;
          var fee = 0;
          var tx = readOnlyWallet.createTx(to, value, fee);

          assert.equal(getFee(tx), fee);
        });

        function getFee(tx) {
          var inputValue = tx.ins.reduce(function(memo, input){
            var id = Array.prototype.reverse.call(input.hash).toString('hex');
            var prevTx = unspentTxs.filter(function(t) {
              return t.getId() === id;
            })[0];
            return memo + prevTx.outs[0].value;
          }, 0);

          return tx.outs.reduce(function(memo, output){
            return memo - output.value;
          }, inputValue);
        }
      });

      describe('signing', function(){
        it('signes the inputs with respective keys', function(){
          var fee = 30000;
          sandbox.stub(TransactionBuilder.prototype, "sign");
          sandbox.stub(TransactionBuilder.prototype, "build");

          readOnlyWallet.createTx(to, value, fee);

          assert(TransactionBuilder.prototype.sign.calledWith(0, readOnlyWallet.getPrivateKeyForAddress(address2)));
          assert(TransactionBuilder.prototype.sign.calledWith(1, readOnlyWallet.getPrivateKeyForAddress(address1)));
          assert(TransactionBuilder.prototype.build.calledWith());
        });
      });

      describe('validations', function(){
        it('errors on invalid address', function(){
          assert.throws(function() { readOnlyWallet.createTx('123', value); });
        });

        it('errors on address with the wrong version', function(){
          assert.throws(function() { readOnlyWallet.createTx('LNjYu1akN22USK3sUrSuJn5WoLMKX5Az9B', value); });
        });

        it('errors on below dust value', function(){
          assert.throws(function() { readOnlyWallet.createTx(to, 546); });
        });

        it('errors on insufficient funds', function(){
          assert.throws(function() { readOnlyWallet.createTx(to, 1415001, 3740); });
        });
      });

    });

    describe('estimateFees', function() {
      var to;

      before(function(){
        readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures)); // reset wallet
        to = 'mh8evwuteapNy7QgSDWeUXTGvFb4mN1qvs';
      });

      it('calculates it correctly with single tx input', function() {
        assert.deepEqual(readOnlyWallet.estimateFees(20000), [2260]);
      });

      it('calculates it correctly with multiple tx inputs', function() {
        assert.deepEqual(readOnlyWallet.estimateFees(1020000), [5220]);
      });

      it('calculates it correctly with utxos passed in', function() {
        var utxos = [{
          txId: '98440fe7035aaec39583f68a251602a5623d34f95dbd9f54e7bc8ff29551729f',
          address: 'n2rvmEac7zD1iknp7nkFfmqXM1pbbAoctw',
          value: 1520000,
          vout: 0,
          confirmations: 3
        }];
        assert.deepEqual(readOnlyWallet.estimateFees(520000, utxos), [2260]);
      });

      it('throws error when unspents are invalid', function() {
        assert.throws(function() {
          readOnlyWallet.estimateFees(to, 20000, [10000], 300);
        }, function(e) {
          assert.equal(e.message, 'Expect utxos to be an array');
          return true;
        });
      });
    });

    describe('sendTx', function() {

      var tx = new Transaction();

      beforeEach(function(){
        sandbox.stub(readOnlyWallet.api.transactions, 'get').resolves([]);
      });

      it('propagates the transaction through the API', function(done) {
        sandbox.stub(readOnlyWallet.api.transactions, 'propagate').resolves();
        readOnlyWallet.sendTx(tx, function(err) {
          try {
            assert.ifError(err);
            assert(readOnlyWallet.api.transactions.propagate.calledWith(tx.toHex()));
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('invokes callback with error on error', function(done) {
        var error = new Error('oops');
        sandbox.stub(readOnlyWallet.api.transactions, 'propagate').rejects(error);
        readOnlyWallet.sendTx(tx, function(err) {
          try {
            assert.equal(err, error);
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    describe('createPrivateKey', function() {
      it('works', function() {
        var privateKey = readOnlyWallet.createPrivateKey('91tphZbASvHRsscCgB6TZibcSYwVNHzBX6xKvjFSMTNvzizaMyo');
        assert(privateKey instanceof bitcoin.ECPair);
      });
    });

    describe('createImportTx', function() {
      var options;

      beforeEach(function() {
        var node = readOnlyWallet.accounts.p2pkh.internal.deriveChild(0);
        var privateKey = new bitcoin.ECPair(BigInteger.fromBuffer(node.privateKey), null, {
          network: network
        });
        options = {
          privateKey: privateKey,
          unspents: [{
            txId: 'a3fa16de242caaa97d69f2d285377a04847edbab4eec13e9ff083e14f77b71c8',
            address: 'myocNrhBsw92CAhoEksYLBEXBWiitfxi2D',
            value: 10000,
            vout: 0,
            type: 'p2pkh',
            confirmations: 10
          }],
          amount: 10000,
          to: 'mo7f7vngyFkPeYsYqnubdeTJfMSxSZVSnL',
          fee: 1000
        };
      });

      it('works', function() {
        var tx = readOnlyWallet.createImportTx(options);
        assert(tx instanceof bitcoin.Transaction);
      });

      it('errors on amount less than fee', function() {
        options.fee = 20000;
        assert.throws(function() { readOnlyWallet.createImportTx(options); });
      });

    });

    describe('getImportTxOptions', function() {
      it('works', function(done) {
        var unspents = [{
          txId: 'a3fa16de242caaa97d69f2d285377a04847edbab4eec13e9ff083e14f77b71c8',
          address: 'myocNrhBsw92CAhoEksYLBEXBWiitfxi2D',
          value: 10000,
          vout: 0,
          confirmations: 10
        },
        {
          txId: '7e6be25012e2ee3450b1435d5115d68a9be1cb376e094877df12a1508f003937',
          address: 'myocNrhBsw92CAhoEksYLBEXBWiitfxi2D',
          value: 10000,
          vout: 0,
          confirmations: 0
        }];
        sandbox.stub(readOnlyWallet.api.addresses, 'unspents').returns(Promise.resolve(unspents));

        var node = readOnlyWallet.accounts.p2pkh.internal.deriveChild(0);
        var privateKey = new bitcoin.ECPair(BigInteger.fromBuffer(node.privateKey), null, {
          network: network
        });
        readOnlyWallet.getImportTxOptions(privateKey).then(function(options) {
          assert.equal(options.privateKey, privateKey);
          assert.equal(options.amount, 10000);
          assert.equal(options.unspents.length, 1);
          assert.deepEqual(options.unspents[0], unspents[0]);
          done();
        }).catch(done);
      });
    });

    describe('exportPrivateKeys', function() {
      it('works', function() {
        var csv = readOnlyWallet.exportPrivateKeys();
        assert.equal(typeof csv, 'string');
      });

      it('errors on missing unspent address', function() {
        var myWallet = Wallet.deserialize(JSON.stringify(fixtures));
        myWallet.unspents.push('missing_address');
        assert.throws(function() {
          myWallet.exportPrivateKeys();
        }, /Unknown address. Make sure the address is from the keychain and has been generated./);
      });
    });

  });
});
