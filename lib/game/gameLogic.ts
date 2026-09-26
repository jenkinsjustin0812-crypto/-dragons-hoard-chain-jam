import type { GameState } from "./gameState";

export function startRound(
  state: GameState,
  wager: number
): GameState {
  if (state.status === "PLAYING") {
    return state;
  }

  if (wager <= 0) {
    return {
      ...state,
      lastEvent: "Enter a valid wager.",
    };
  }

  if (wager > state.balance) {
    return {
      ...state,
      lastEvent: "Insufficient balance.",
    };
  }

  return {
    ...state,
    status: "PLAYING",
    balance: state.balance - wager,
    wager,

    floor: 1,
    multiplier: 1,
    currentPayout: wager,

    sessionId: null,
    sessionKey: null,
    transactionHash: null,

    // IMPORTANT:
    // Local demo does not wait for Chain.
    waitingForChain: false,

    lastEvent:
      "Vault opened. Choose DESCEND or EXTRACT.",
  };
}

export function descend(
  state: GameState
): GameState {
  if (state.status !== "PLAYING") {
    return state;
  }

  const nextFloor = state.floor + 1;

  const multiplierTable = [
    1.00,
    1.15,
    1.32,
    1.52,
    1.76,
    2.05,
    2.40,
    2.85,
  ];

  const index = Math.min(
    nextFloor - 1,
    multiplierTable.length - 1
  );

  const nextMultiplier =
    multiplierTable[index];

  const nextPayout =
    state.wager * nextMultiplier;

  return {
    ...state,

    floor: nextFloor,
    multiplier: nextMultiplier,
    currentPayout: nextPayout,

    // Local demo continues immediately.
    waitingForChain: false,

    lastEvent:
      `Floor ${nextFloor} reached. Current payout: ${nextPayout.toFixed(2)}`,
  };
}

export function extract(
  state: GameState
): GameState {
  if (state.status !== "PLAYING") {
    return state;
  }

  const payout = state.currentPayout;

  return {
    ...state,

    status: "EXTRACTED",

    // Give the payout back to the local demo balance.
    balance: state.balance + payout,

    waitingForChain: false,

    lastEvent:
      `Extraction successful. You received ${payout.toFixed(2)}.`,
  };
}

export function resetRound(
  state: GameState
): GameState {
  return {
    ...state,

    status: "IDLE",

    wager: 10,
    floor: 0,
    multiplier: 1,
    currentPayout: 0,

    sessionId: null,
    sessionKey: null,
    transactionHash: null,

    waitingForChain: false,

    lastEvent: null,
  };
}