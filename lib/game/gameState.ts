export type GameStatus =
  | "IDLE"
  | "PLAYING"
  | "EXTRACTED"
  | "LOST";

export interface MarketState {
  resource: string;
  supply: number;
  demand: number;
  price: number;
  trend: string;
}

export interface GameState {
  status: GameStatus;

  // Local preview balance for the UI.
  // Chain will become authoritative once the host bridge is connected.
  balance: number;

  wager: number;

  floor: number;
  multiplier: number;
  currentPayout: number;

  // Chain casino session
  sessionId: string | null;
  sessionKey: string | null;
  transactionHash: string | null;

  waitingForChain: boolean;

  market: MarketState;

  lastEvent: string | null;
}

export const INITIAL_GAME_STATE: GameState = {
  status: "IDLE",

  balance: 1000,
  wager: 10,

  floor: 0,
  multiplier: 1,
  currentPayout: 0,

  sessionId: null,
  sessionKey: null,
  transactionHash: null,

  waitingForChain: false,

  market: {
    resource: "Dragon Crystal",
    supply: 42,
    demand: 78,
    price: 850,
    trend: "UP",
  },

  lastEvent: null,
};