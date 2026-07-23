export type TokenSymbol = "ETH" | "USDC" | "RLO";

export interface Token {
  symbol: TokenSymbol;
  name: string;
  balance: number;
  usdPrice: number;
  accent: string;
}

export type WalletBalance = Record<TokenSymbol, number>;

export interface SecuritySettings {
  protectionEnabled: boolean;
  largeTransferLimit: number;
  timeLockSeconds: number;
  guardianThreshold: number;
  aiAgentDailyLimit: number;
  blockSuspiciousAddresses: boolean;
  protectNewAddresses: boolean;
  emergencyFreeze: boolean;
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type TransactionStatus =
  | "Confirmed"
  | "Blocked"
  | "Timelocked"
  | "Awaiting Guardian"
  | "Cancelled"
  | "Agent Denied"
  | "Frozen"
  | "Recovered";

export interface DemoTransaction {
  id: string;
  hash: string;
  blockNumber: number;
  fee: number;
  type: string;
  token: TokenSymbol;
  amount: number;
  from: string;
  to: string;
  status: TransactionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  policies: string[];
  createdAt: number;
}

export type DemoScenario =
  | "normal"
  | "large"
  | "phishing"
  | "contract"
  | "agent"
  | "compromise"
  | "guardian";

export type WalletProtectionState = "Protected" | "Frozen" | "Recovering";

export interface PendingTransfer {
  transaction: DemoTransaction;
  startedAt: number;
  endsAt: number;
}

export interface RecoveryProcess {
  transaction: DemoTransaction;
  startedAt: number;
}

export interface RiskInput {
  amount: number;
  token: TokenSymbol;
  addressType: "trusted" | "new" | "phishing" | "contract";
  settings: SecuritySettings;
  isAgent?: boolean;
  compromised?: boolean;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
  decision: "allow" | "review" | "timelock" | "block";
}
