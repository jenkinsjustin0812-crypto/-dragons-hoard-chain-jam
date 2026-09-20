"use client";

import { useEffect, useRef, useState } from "react";
import { decodeAbiParameters, encodeAbiParameters } from "viem";

import HoardPanel from "@/components/game/HoardPanel";

import {
  INITIAL_GAME_STATE,
  type GameState,
} from "@/lib/game/gameState";

import {
  startRound,
  descend,
  extract,
  resetRound,
} from "@/lib/game/gameLogic";

import {
  connectGameToHost,
  type HostApiV1,
  type HostSnapshotV1,
} from "@/lib/casino-sdk/guest";

type HexString = `0x${string}`;

const GAME_DATA = encodeAbiParameters(
  [],
  []
) as HexString;

const DESCEND_ACTION = "0x00" as HexString;
const EXTRACT_ACTION = "0x01" as HexString;

const GAME_STATE_PARAMS = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "bool" },
] as const;

function decodeGameState(gameState: HexString) {
  try {
    const [floor, currentPayout, active] =
      decodeAbiParameters(
        GAME_STATE_PARAMS,
        gameState
      );

    return {
      floor: Number(floor),
      currentPayout: Number(currentPayout),
      active,
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [game, setGame] =
    useState<GameState>(INITIAL_GAME_STATE);

  const [snapshot, setSnapshot] =
    useState<HostSnapshotV1 | null>(null);

  const hostRef =
    useRef<HostApiV1 | null>(null);

  const sessionKeyRef =
    useRef<string | null>(null);

  /*
    Connect to Chain host.
  */
  useEffect(() => {
    let connection:
      ReturnType<typeof connectGameToHost> | null = null;

    try {
      connection = connectGameToHost({
        async setState(
          nextSnapshot: HostSnapshotV1 | null
        ) {
          if (!nextSnapshot) return;

          setSnapshot(nextSnapshot);

          console.log(
            "[Dragon's Hoard] Chain snapshot:",
            nextSnapshot
          );
        },
      });

      connection.promise
        .then((hostApi) => {
          hostRef.current = hostApi;

          console.log(
            "[Dragon's Hoard] Chain host connected."
          );
        })
        .catch((error) => {
          console.warn(
            "[Dragon's Hoard] Host unavailable:",
            error
          );
        });
    } catch (error) {
      console.warn(
        "[Dragon's Hoard] Running outside Chain host.",
        error
      );
    }

    return () => {
      connection?.destroy();
    };
  }, []);

  /*
    Watch the Chain snapshot.

    The host returns sessionKey when opening a session.
    The actual session row then contains sessionId,
    gameState, payout and settlement information.
  */
  useEffect(() => {
    const sessionKey =
      sessionKeyRef.current;

    if (!sessionKey || !snapshot) {
      return;
    }

    const row =
      snapshot.sessions.items.find(
        (item) =>
          item.sessionKey === sessionKey
      );

    if (!row) {
      return;
    }

    console.log(
      "[Dragon's Hoard] Session row:",
      row
    );

    const decoded =
      row.raw.gameState
        ? decodeGameState(
            row.raw.gameState
          )
        : null;

    /*
      Update the actual session ID from Chain.
    */
    setGame((current) => ({
      ...current,
      sessionId: row.sessionId,
      sessionKey: row.sessionKey,
      transactionHash:
        row.raw.settleTransactionHash ??
        row.raw.openTransactionHash ??
        current.transactionHash,
    }));

    /*
      If the game is still waiting for randomness,
      keep waiting.
    */
    if (!row.isSettled) {
      if (decoded) {
        setGame((current) => ({
          ...current,
          floor: decoded.floor,
          currentPayout:
            decoded.currentPayout,
          multiplier:
            current.wager > 0
              ? decoded.currentPayout /
                current.wager
              : 1,
          waitingForChain: true,
          lastEvent:
            decoded.floor > current.floor
              ? `Floor ${decoded.floor} reached. Waiting for Chain outcome...`
              : "Waiting for Chain...",
        }));
      }

      return;
    }

    /*
      Chain has settled the session.
    */
    if (decoded) {
      const payout =
        Number(row.payout ?? "0");

      const won =
        payout > 0 ||
        decoded.currentPayout > 0;

      setGame((current) => ({
        ...current,
        sessionId: row.sessionId,
        sessionKey: row.sessionKey,

        floor: decoded.floor,

        multiplier:
          current.wager > 0
            ? decoded.currentPayout /
              current.wager
            : 1,

        currentPayout:
          payout > 0
            ? payout
            : decoded.currentPayout,

        status: won
          ? "EXTRACTED"
          : "LOST",

        waitingForChain: false,

        lastEvent: won
          ? "Chain settled the raid successfully."
          : "Chain settled the raid. The Dragon claimed the hoard.",
      }));
    }

    /*
      Reveal is a display/lifecycle step after
      settlement. Chain settlement is already final.
    */
    const hostApi =
      hostRef.current;

    if (hostApi) {
      void hostApi
        .revealOutcome({
          sessionId: row.sessionId,
        })
        .catch((error) => {
          console.warn(
            "[Dragon's Hoard] Outcome reveal failed:",
            error
          );
        });
    }
  }, [snapshot]);

  /*
    START RAID
  */
  async function handleStart(
    wager: number
  ) {
    const next =
      startRound(game, wager);

    setGame(next);

    const hostApi =
      hostRef.current;

    if (!hostApi) {
      setGame((current) => ({
        ...current,
        waitingForChain: false,
        lastEvent:
          "Chain host is not connected.",
      }));

      return;
    }

    try {
      const result =
        await hostApi.openSession({
          wager: String(wager),
          gameData: GAME_DATA,
        });

      /*
        IMPORTANT:
        openSession returns sessionKey.
        We do NOT treat it as sessionId.
      */
      sessionKeyRef.current =
        result.sessionKey;

      setGame((current) => ({
        ...current,
        sessionKey:
          result.sessionKey,
        transactionHash:
          result.transactionHash,
        waitingForChain: true,
        lastEvent:
          "Raid opened on Chain. Choose your next move.",
      }));
    } catch (error) {
      console.error(error);

      setGame((current) => ({
        ...current,
        balance:
          current.balance + wager,
        status: "IDLE",
        waitingForChain: false,
        lastEvent:
          "Chain could not open the raid.",
      }));
    }
  }

  /*
    DESCEND
  */
  async function handleDescend() {
    const sessionKey =
      sessionKeyRef.current;

    if (!sessionKey) {
      setGame((current) => ({
        ...current,
        lastEvent:
          "No active Chain session.",
      }));

      return;
    }

    const row =
      snapshot?.sessions.items.find(
        (item) =>
          item.sessionKey ===
          sessionKey
      );

    if (!row) {
      setGame((current) => ({
        ...current,
        lastEvent:
          "Chain session is still syncing.",
      }));

      return;
    }

    setGame((current) => ({
      ...descend(current),
      sessionId: row.sessionId,
      waitingForChain: true,
    }));

    const hostApi =
      hostRef.current;

    if (!hostApi) {
      return;
    }

    try {
      const result =
        await hostApi.submitAction({
          sessionId: row.sessionId,
          actionData:
            DESCEND_ACTION,
        });

      setGame((current) => ({
        ...current,
        transactionHash:
          result.transactionHash,
        waitingForChain: true,
        lastEvent:
          "DESCEND submitted. Waiting for Chain randomness...",
      }));
    } catch (error) {
      console.error(error);

      setGame((current) => ({
        ...current,
        waitingForChain: false,
        lastEvent:
          "Chain rejected the descent.",
      }));
    }
  }

  /*
    EXTRACT
  */
  async function handleExtract() {
    const sessionKey =
      sessionKeyRef.current;

    if (!sessionKey) {
      setGame((current) => ({
        ...current,
        lastEvent:
          "No active Chain session.",
      }));

      return;
    }

    const row =
      snapshot?.sessions.items.find(
        (item) =>
          item.sessionKey ===
          sessionKey
      );

    if (!row) {
      setGame((current) => ({
        ...current,
        lastEvent:
          "Chain session is still syncing.",
      }));

      return;
    }

    setGame((current) => ({
      ...extract(current),
      sessionId: row.sessionId,
      waitingForChain: true,
      lastEvent:
        "Extraction submitted. Waiting for Chain settlement...",
    }));

    const hostApi =
      hostRef.current;

    if (!hostApi) {
      return;
    }

    try {
      const result =
        await hostApi.submitAction({
          sessionId: row.sessionId,
          actionData:
            EXTRACT_ACTION,
        });

      setGame((current) => ({
        ...current,
        transactionHash:
          result.transactionHash,
        waitingForChain: true,
        lastEvent:
          "Extraction submitted. Waiting for Chain settlement...",
      }));
    } catch (error) {
      console.error(error);

      setGame((current) => ({
        ...current,
        waitingForChain: false,
        lastEvent:
          "Chain rejected the extraction.",
      }));
    }
  }

  /*
    RESET
  */
  function handleReset() {
    sessionKeyRef.current = null;

    setGame(
      resetRound(game)
    );
  }

  return (
    <HoardPanel
      state={game}
      onStart={handleStart}
      onDescend={handleDescend}
      onExtract={handleExtract}
      onReset={handleReset}
    />
  );
}