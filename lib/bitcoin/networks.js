'use strict';
module.exports = {
  mainnet: {
    bitcoin: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bech32: 'bc',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      bip49: "m/49'/0'/0'",
      bip84: "m/84'/0'/0'",
      pubKeyHash: 0x00,
      scriptHash: 0x05,
      wif: 0x80,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh', 'p2sh', 'p2wpkh']
    },
    bitcoincash: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      pubKeyHash: 0x00,
      scriptHash: 0x05,
      wif: 0x80,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
    bitcoinsv: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      pubKeyHash: 0x00,
      scriptHash: 0x05,
      wif: 0x80,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
    litecoin: {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: {
        public: 0x019da462,
        private: 0x019d9cfe
      },
      bip49: "m/49'/2'/0'",
      bip84: "m/84'/2'/0'",
      pubKeyHash: 0x30,
      scriptHash: 0x32,
      wif: 0xb0,
      dustThreshold: 54600,
      dustSoftThreshold: 100000,
      feePerKb: 100000,
      addressTypes: ['p2pkh', 'p2sh', 'p2wpkh']
    },
    dogecoin: {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bip32: {
        public: 0x02facafd,
        private: 0x02fac398
      },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e,
      dustThreshold: 100000000,
      feePerKb: 100000000,
      addressTypes: ['p2pkh']
    },
    dash: {
      messagePrefix: '\x19DarkCoin Signed Message:\n',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      pubKeyHash: 0x4c,
      scriptHash: 0x10,
      wif: 0xcc,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
  },
  regtest: {
    bitcoin: {
      bech32: 'bcrt',
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      bip49: "m/49'/1'/0'",
      bip84: "m/84'/1'/0'",
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh', 'p2sh', 'p2wpkh']
    },
    bitcoincash: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
    bitcoinsv: {
      messagePrefix: '\x18Bitcoin Signed Message:\n',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
    litecoin: {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'rltc',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      bip49: "m/49'/1'/0'",
      bip84: "m/84'/1'/0'",
      pubKeyHash: 0x6f,
      scriptHash: 0x3a,
      wif: 0xef,
      dustThreshold: 54600,
      dustSoftThreshold: 100000,
      feePerKb: 100000,
      addressTypes: ['p2pkh', 'p2sh', 'p2wpkh']
    },
    dogecoin: {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
      dustThreshold: 100000000,
      feePerKb: 100000000,
      addressTypes: ['p2pkh']
    },
    dash: {
      messagePrefix: '\x19DarkCoin Signed Message:\n',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x8c,
      scriptHash: 0x13,
      wif: 0xef,
      dustThreshold: 546,
      feePerKb: 10000,
      addressTypes: ['p2pkh']
    },
  }
};
