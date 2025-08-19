import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
  admin: string;
  delegateAdmin: string | null;
  paused: boolean;
  totalSupply: bigint;
  balances: Map<string, bigint>;
  staked: Map<string, bigint>;
  allowances: Map<string, bigint>;
  stakeTimestamps: Map<string, bigint>;
  MAX_SUPPLY: bigint;
  STAKE_LOCK_PERIOD: bigint;

  isAuthorized(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setDelegateAdmin(caller: string, delegate: string | null): { value: boolean } | { error: number };
  mint(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  burn(caller: string, amount: bigint): { value: boolean } | { error: number };
  transfer(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  approve(caller: string, spender: string, amount: bigint): { value: boolean } | { error: number };
  transferFrom(caller: string, owner: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  stake(caller: string, amount: bigint): { value: boolean } | { error: number };
  unstake(caller: string, amount: bigint, blockHeight: bigint): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  delegateAdmin: null,
  paused: false,
  totalSupply: 0n,
  balances: new Map(),
  staked: new Map(),
  allowances: new Map(),
  stakeTimestamps: new Map(),
  MAX_SUPPLY: 1_000_000_000n,
  STAKE_LOCK_PERIOD: 1440n,

  isAuthorized(caller: string) {
    return caller === this.admin || caller === this.delegateAdmin;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAuthorized(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  setDelegateAdmin(caller: string, delegate: string | null) {
    if (caller !== this.admin) return { error: 100 };
    if (delegate === "SP000000000000000000002Q6VF78") return { error: 105 };
    this.delegateAdmin = delegate;
    return { value: true };
  },

  mint(caller: string, recipient: string, amount: bigint) {
    if (!this.isAuthorized(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 107 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (this.totalSupply + amount > this.MAX_SUPPLY) return { error: 103 };
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    this.totalSupply += amount;
    return { value: true };
  },

  burn(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 107 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.totalSupply -= amount;
    return { value: true };
  },

  transfer(caller: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 107 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    return { value: true };
  },

  approve(caller: string, spender: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (spender === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 107 };
    this.allowances.set(`${caller}:${spender}`, amount);
    return { value: true };
  },

  transferFrom(caller: string, owner: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 107 };
    const allowance = this.allowances.get(`${owner}:${caller}`) || 0n;
    const ownerBal = this.balances.get(owner) || 0n;
    if (allowance < amount) return { error: 100 };
    if (ownerBal < amount) return { error: 101 };
    this.allowances.set(`${owner}:${caller}`, allowance - amount);
    this.balances.set(owner, ownerBal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    return { value: true };
  },

  stake(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 107 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.staked.set(caller, (this.staked.get(caller) || 0n) + amount);
    this.stakeTimestamps.set(caller, 1000n); // Mock block height
    return { value: true };
  },

  unstake(caller: string, amount: bigint, blockHeight: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 107 };
    const stakeBal = this.staked.get(caller) || 0n;
    if (stakeBal < amount) return { error: 102 };
    const stakeTime = this.stakeTimestamps.get(caller) || 0n;
    if (blockHeight - stakeTime < this.STAKE_LOCK_PERIOD) return { error: 106 };
    this.staked.set(caller, stakeBal - amount);
    this.balances.set(caller, (this.balances.get(caller) || 0n) + amount);
    if (stakeBal === amount) this.stakeTimestamps.delete(caller);
    return { value: true };
  },
};

describe("NewsPledge Journalist Token", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.delegateAdmin = null;
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.balances = new Map();
    mockContract.staked = new Map();
    mockContract.allowances = new Map();
    mockContract.stakeTimestamps = new Map();
  });

  it("should allow admin to mint tokens", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5...", 1000n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
  });

  it("should prevent non-admin from minting", () => {
    const result = mockContract.mint("ST2CY5...", "ST3NB...", 1000n);
    expect(result).toEqual({ error: 100 });
  });

  it("should prevent minting over max supply", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5...", 2_000_000_000n);
    expect(result).toEqual({ error: 103 });
  });

  it("should allow delegate admin to mint", () => {
    mockContract.setDelegateAdmin(mockContract.admin, "ST3NB...");
    const result = mockContract.mint("ST3NB...", "ST2CY5...", 1000n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(1000n);
  });

  it("should transfer tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    const result = mockContract.transfer("ST2CY5...", "ST3NB...", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
    expect(mockContract.balances.get("ST3NB...")).toBe(200n);
  });

  it("should prevent transfers when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.transfer("ST2CY5...", "ST3NB...", 10n);
    expect(result).toEqual({ error: 104 });
  });

  it("should prevent transfers with insufficient balance", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 100n);
    const result = mockContract.transfer("ST2CY5...", "ST3NB...", 200n);
    expect(result).toEqual({ error: 101 });
  });

  it("should approve and transfer-from", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.approve("ST2CY5...", "ST3NB...", 200n);
    const result = mockContract.transferFrom("ST3NB...", "ST2CY5...", "ST4RE...", 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(400n);
    expect(mockContract.balances.get("ST4RE...")).toBe(100n);
    expect(mockContract.allowances.get("ST2CY5...:ST3NB...")).toBe(100n);
  });

  it("should stake tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    const result = mockContract.stake("ST2CY5...", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
    expect(mockContract.staked.get("ST2CY5...")).toBe(200n);
    expect(mockContract.stakeTimestamps.get("ST2CY5...")).toBe(1000n);
  });

  it("should unstake tokens after lock period", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.stake("ST2CY5...", 200n);
    const result = mockContract.unstake("ST2CY5...", 100n, 2440n); // After lock period
    expect(result).toEqual({ value: true });
    expect(mockContract.staked.get("ST2CY5...")).toBe(100n);
    expect(mockContract.balances.get("ST2CY5...")).toBe(400n);
  });

  it("should prevent unstaking before lock period", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.stake("ST2CY5...", 200n);
    const result = mockContract.unstake("ST2CY5...", 100n, 1001n); // Before lock period
    expect(result).toEqual({ error: 106 });
  });

  it("should delete timestamp when all tokens are unstaked", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.stake("ST2CY5...", 200n);
    const result = mockContract.unstake("ST2CY5...", 200n, 2440n);
    expect(result).toEqual({ value: true });
    expect(mockContract.staked.get("ST2CY5...")).toBe(0n);
    expect(mockContract.balances.get("ST2CY5...")).toBe(500n);
    expect(mockContract.stakeTimestamps.get("ST2CY5...")).toBeUndefined();
  });

  it("should prevent zero-amount operations", () => {
    expect(mockContract.mint(mockContract.admin, "ST2CY5...", 0n)).toEqual({ error: 107 });
    expect(mockContract.burn("ST2CY5...", 0n)).toEqual({ error: 107 });
    expect(mockContract.transfer("ST2CY5...", "ST3NB...", 0n)).toEqual({ error: 107 });
    expect(mockContract.approve("ST2CY5...", "ST3NB...", 0n)).toEqual({ error: 107 });
    expect(mockContract.stake("ST2CY5...", 0n)).toEqual({ error: 107 });
    expect(mockContract.unstake("ST2CY5...", 0n, 2440n)).toEqual({ error: 107 });
  });
});