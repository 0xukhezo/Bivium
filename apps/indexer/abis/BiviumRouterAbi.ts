// Auto-extracted from apps/contracts/out — do not edit by hand.
// Re-run: pnpm --filter @bivium/indexer regen-abis (see README).
export const BiviumRouterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "bivium_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BIVIUM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "borrow",
    "inputs": [
      {
        "name": "order",
        "type": "tuple",
        "internalType": "struct IBiviumRouter.BorrowOrder",
        "components": [
          {
            "name": "loanToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "collateralToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "loanAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "collateralAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxAvgRatePerSecond",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minHealthFactor",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "candidates",
            "type": "tuple[]",
            "internalType": "struct IBiviumRouter.BorrowFill[]",
            "components": [
              {
                "name": "creator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "ratePerSecond",
                "type": "uint256",
                "internalType": "uint256"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "closePosition",
    "inputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "internalType": "struct IBiviumRouter.ClosePositionItem[]",
        "components": [
          {
            "name": "params",
            "type": "tuple",
            "internalType": "struct MarketParams",
            "components": [
              {
                "name": "loanToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "collateralToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "oracle",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "ratePerSecond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "lltv",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "creator",
                "type": "address",
                "internalType": "address"
              }
            ]
          },
          {
            "name": "assets",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "shares",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxAssetsIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "collateralAmount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "repay",
    "inputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "internalType": "struct IBiviumRouter.RepayItem[]",
        "components": [
          {
            "name": "params",
            "type": "tuple",
            "internalType": "struct MarketParams",
            "components": [
              {
                "name": "loanToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "collateralToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "oracle",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "ratePerSecond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "lltv",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "creator",
                "type": "address",
                "internalType": "address"
              }
            ]
          },
          {
            "name": "assets",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "shares",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxAssetsIn",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Fill",
    "inputs": [
      {
        "name": "borrower",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "lender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "loanToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "rate",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OrderFilled",
    "inputs": [
      {
        "name": "borrower",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "loanToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "collateralToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "loanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "collateralAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "weightedAvgRate",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fillsCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EmptyCandidates",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyItems",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HealthFactorTooLow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InconsistentInput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientLiquidity",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SlippageExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnsafeHealthFactor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnsupportedCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroBivium",
    "inputs": []
  }
] as const;
