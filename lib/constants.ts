import type {
  DemoTransaction,
  SecuritySettings,
  Token,
  TokenSymbol,
  WalletBalance,
} from "@/types";

export const ADDRESSES = {
  user: "0x71F4A8C9B2E61D53047A823FCF14913E339A9A2C",
  trusted: "0x82A1D16E30C74F29D5872A7EDE10884636A24F09",
  new: "0x3C98E0D11A94A3D2DB49562DB6C25E2FC78E88A1",
  guardian: "0xA91BD42734052E91B2E103DD6E27988A83042F32",
  phishing: "0xDEAD9F0327C146A70B6E5E3D26AC711BADC0FFEE",
  contract: "0xBADCAFE0327C146A70B6E5E3D26AC711BADC0DE0",
  recovered: "0x93E8C711FBD5488F64164DA9574F1C892421B04A",
} as const;

export const DEFAULT_BALANCES: WalletBalance = {
  ETH: 3.42,
  USDC: 8250,
  RLO: 1240,
};

export const TOKENS: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: DEFAULT_BALANCES.ETH,
    usdPrice: 2850,
    accent: "#8d84ff",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: DEFAULT_BALANCES.USDC,
    usdPrice: 1,
    accent: "#478cff",
  },
  {
    symbol: "RLO",
    name: "Rialo",
    balance: DEFAULT_BALANCES.RLO,
    usdPrice: 2,
    accent: "#c8ff4d",
  },
];

export const TOKEN_PRICES: Record<TokenSymbol, number> = {
  ETH: 2850,
  USDC: 1,
  RLO: 2,
};

export const DEFAULT_SETTINGS: SecuritySettings = {
  protectionEnabled: true,
  largeTransferLimit: 1000,
  timeLockSeconds: 30,
  guardianThreshold: 5000,
  aiAgentDailyLimit: 10,
  blockSuspiciousAddresses: true,
  protectNewAddresses: true,
  emergencyFreeze: true,
};

export const INITIAL_ACTIVITY: DemoTransaction[] = [
  {
    id: "welcome-activity",
    hash: "0x8b77386f2e71e5b9b9f8a2c5fd29835e43c8a0bd739bf8c8f76c59fbd13d2f6a",
    blockNumber: 21804122,
    fee: 0.00042,
    type: "Received",
    token: "ETH",
    amount: 0.18,
    from: ADDRESSES.trusted,
    to: ADDRESSES.user,
    status: "Confirmed",
    riskScore: 5,
    riskLevel: "Low",
    reasons: ["Trusted address"],
    createdAt: Date.now() - 1000 * 60 * 42,
  },
];

export const SCENARIO_LABELS = {
  normal: {
    title: "Normal Transfer",
    description: "100 USDC to a trusted address",
  },
  large: {
    title: "Large Transfer",
    description: "5,000 USDC to a new address",
  },
  phishing: {
    title: "Phishing Address",
    description: "Known malicious recipient",
  },
  contract: {
    title: "Unknown Contract",
    description: "Unlimited token approval",
  },
  agent: {
    title: "AI Agent Overspend",
    description: "50 USDC vs. a 10 USDC limit",
  },
  compromise: {
    title: "Wallet Compromise",
    description: "Freeze and recover the demo wallet",
  },
  guardian: {
    title: "Guardian Approval",
    description: "Review the pending large transfer",
  },
} as const;

export const SECURITY_STEPS = [
  "Transaction received",
  "Spending policy checked",
  "Address reputation checked",
  "Risk score calculated",
  "Protection decision executed",
] as const;
