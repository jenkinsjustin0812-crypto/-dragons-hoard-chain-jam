"use client";

import { useEffect, useRef, useState } from "react";

import {
  decodeAbiParameters,
  encodeAbiParameters,
} from "viem";

import { createClient } from "@/lib/supabase/client";

import HoardPanel from "@/components/game/HoardPanel";
import LoginScreen from "@/components/auth/LoginScreen";
import WalletOnboarding from "@/components/wallet/WalletOnboarding";

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
} from "@/lib/casino-sdk/src/guest";

/* =========================================================
   TYPES
   ========================================================= */

type HexString = `0x${string}`;

/* =========================================================
   CHAIN GAME DATA
   ========================================================= */

const GAME_DATA =
  encodeAbiParameters([], []) as HexString;

/*
 * Chain action encoding:
 *
 * 0x00 = DESCEND
 * 0x01 = EXTRACT
 */

const DESCEND_ACTION =
  "0x00" as HexString;

const EXTRACT_ACTION =
  "0x01" as HexString;

/*
 * Solidity game state:
 *
 * uint8 floor
 * uint256 currentPayout
 * bool active
 */

const GAME_STATE_PARAMS = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "bool" },
] as const;

/* =========================================================
   DECODE CHAIN GAME STATE
   ========================================================= */

function decodeGameState(
  gameState: HexString
) {
  try {
    const [
      floor,
      currentPayout,
      active,
    ] = decodeAbiParameters(
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

/* =========================================================
   HOME
   ========================================================= */

export default function Home() {
  /* =======================================================
     LOCAL GAME STATE
     ======================================================= */

  const [game, setGame] =
    useState<GameState>(
      INITIAL_GAME_STATE
    );

  /* =======================================================
     CHAIN HOST SNAPSHOT
     ======================================================= */

  const [snapshot, setSnapshot] =
    useState<HostSnapshotV1 | null>(
      null
    );

  /* =======================================================
     CHAIN HOST API
     ======================================================= */

  const hostRef =
    useRef<HostApiV1 | null>(null);

  /*
   * Temporary session key returned
   * by openSession().
   */

  const sessionKeyRef =
    useRef<string | null>(null);

  /* =======================================================
     AUTHENTICATION FLOW
     ======================================================= */

  const [screen, setScreen] =
    useState<
      "LOGIN" | "ONBOARDING" | "GAME"
    >("LOGIN");

  const [authChecking, setAuthChecking] =
    useState(true);

  /* =======================================================
     CHECK SUPABASE SESSION
     ======================================================= */

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setScreen("GAME");
        } else {
          setScreen("LOGIN");
        }
      } catch (error) {
        console.error(
          "[Dragon's Hoard] Auth check failed:",
          error
        );

        setScreen("LOGIN");
      } finally {
        setAuthChecking(false);
      }
    }

    void checkSession();

    /*
     * Keep UI synchronized with
     * Supabase Auth.
     */

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session) {
            setScreen("GAME");
          } else {
            setScreen("LOGIN");
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     CONNECT TO CHAIN HOST
     ======================================================= */

  useEffect(() => {
    if (screen !== "GAME") {
      return;
    }

    /*
     * Connection object returned by
     * the Chain SDK.
     */

    let connection:
      ReturnType<
        typeof connectGameToHost
      > | null = null;

    try {
      connection =
        connectGameToHost({
          async setState(
            nextSnapshot:
              HostSnapshotV1 | null
          ) {
            if (!nextSnapshot) {
              return;
            }

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

          setGame((current) => ({
            ...current,

            lastEvent:
              "Chain host connected. Vault ready.",
          }));

          console.log(
            "[Dragon's Hoard] Chain host connected."
          );
        })
        .catch((error) => {
          console.warn(
            "[Dragon's Hoard] Host unavailable:",
            error
          );

          /*
           * IMPORTANT:
           *
           * Running directly at localhost is
           * allowed in standalone demo mode.
           */

          setGame((current) => ({
            ...current,

            lastEvent:
              "Standalone mode. Local vault ready.",
          }));
        });
    } catch (error) {
      console.warn(
        "[Dragon's Hoard] Running outside Chain host.",
        error
      );

      /*
       * Standalone/local mode.
       */

      setGame((current) => ({
        ...current,

        lastEvent:
          "Standalone mode. Local vault ready.",
      }));
    }

    return () => {
      connection?.destroy();

      hostRef.current = null;
      setSnapshot(null);
    };
  }, [screen]);

  /* =======================================================
     WATCH CHAIN SESSION
     ======================================================= */

  useEffect(() => {
    const sessionKey =
      sessionKeyRef.current;

    if (!sessionKey || !snapshot) {
      return;
    }

    /*
     * Find the actual Chain session
     * using the temporary session key.
     */

    const row =
      snapshot.sessions.items.find(
        (item) =>
          item.sessionKey ===
          sessionKey
      );

    if (!row) {
      return;
    }

    console.log(
      "[Dragon's Hoard] Session row:",
      row
    );

    /*
     * Decode authoritative Chain game state.
     */

    const decoded =
      row.raw.gameState
        ? decodeGameState(
            row.raw.gameState as HexString
          )
        : null;

    /*
     * Store actual Chain session ID.
     */

    setGame((current) => ({
      ...current,

      sessionId:
        row.sessionId,

      sessionKey:
        row.sessionKey,

      transactionHash:
        row.raw
          .settleTransactionHash ??
        row.raw.openTransactionHash ??
        current.transactionHash,
    }));

    /* =====================================================
       WAITING FOR CHAIN
       ===================================================== */

    if (!row.isSettled) {
      if (decoded) {
        setGame((current) => ({
          ...current,

          floor:
            decoded.floor,

          currentPayout:
            decoded.currentPayout,

          multiplier:
            current.wager > 0
              ? decoded.currentPayout /
                current.wager
              : 1,

          waitingForChain: true,

          lastEvent:
            decoded.floor >
            current.floor
              ? `Floor ${decoded.floor} reached. Waiting for Chain outcome...`
              : "Waiting for Chain...",
        }));
      }

      return;
    }

    /* =====================================================
       CHAIN SETTLEMENT
       ===================================================== */

    if (decoded) {
      const payout =
        Number(row.payout ?? "0");

      const won =
        payout > 0 ||
        decoded.currentPayout > 0;

      setGame((current) => ({
        ...current,

        sessionId:
          row.sessionId,

        sessionKey:
          row.sessionKey,

        floor:
          decoded.floor,

        multiplier:
          current.wager > 0
            ? decoded.currentPayout /
              current.wager
            : 1,

        currentPayout:
          payout > 0
            ? payout
            : decoded.currentPayout,

        status:
          won
            ? "EXTRACTED"
            : "LOST",

        waitingForChain: false,

        lastEvent:
          won
            ? "Chain settled the raid successfully."
            : "Chain settled the raid. The Dragon claimed the hoard.",
      }));
    }

    /* =====================================================
       REVEAL OUTCOME
       ===================================================== */

    const hostApi =
      hostRef.current;

    if (hostApi) {
      void hostApi
        .revealOutcome({
          sessionId:
            row.sessionId,
        })
        .catch((error) => {
          console.warn(
            "[Dragon's Hoard] Outcome reveal failed:",
            error
          );
        });
    }
  }, [snapshot]);

  /* =======================================================
     START RAID
     ======================================================= */

  async function handleStart(
    wager: number
  ) {
    /*
     * Update local UI immediately.
     *
     * In standalone mode this is the
     * actual local game state.
     */

    const next =
      startRound(game, wager);

    setGame(next);

    /*
     * Get Chain host.
     */

    const hostApi =
      hostRef.current;

    /*
     * ==========================================
     * STANDALONE MODE
     * ==========================================
     *
     * If the game is opened directly at
     * localhost:3000, there is no Chain host.
     *
     * Allow the local game to continue.
     */

    if (!hostApi) {
      setGame((current) => ({
        ...current,

        waitingForChain: false,

        lastEvent:
          "Local demo: vault opened. Choose DESCEND or EXTRACT.",
      }));

      return;
    }

    /* =====================================================
       CHAIN MODE
       ===================================================== */

    try {
      /*
       * Open real Chain casino session.
       */

      const result =
        await hostApi.openSession({
          wager: String(wager),

          gameData:
            GAME_DATA,
        });

      /*
       * Save temporary session key.
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
      console.error(
        "[Dragon's Hoard] Open session failed:",
        error
      );

      /*
       * Return wager to local balance
       * if Chain rejected the session.
       */

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

  /* =======================================================
     DESCEND
     ======================================================= */

  async function handleDescend() {
    const hostApi =
      hostRef.current;

    const sessionKey =
      sessionKeyRef.current;

    /*
     * ==========================================
     * STANDALONE / LOCAL DEMO MODE
     * ==========================================
     *
     * This is what allows the game to work
     * when opened directly at localhost:3000.
     */

    if (!hostApi || !sessionKey) {
      setGame((current) => {
        const next =
          descend(current);

        return {
          ...next,

          waitingForChain: false,

          lastEvent:
            `Local demo: descended to floor ${next.floor}. Current payout: ${next.currentPayout.toFixed(2)}`,
        };
      });

      return;
    }

    /* =====================================================
       CHAIN MODE
       ===================================================== */

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

    /*
     * Update local display while
     * Chain processes the request.
     */

    setGame((current) => ({
      ...descend(current),

      sessionId:
        row.sessionId,

      waitingForChain: true,

      lastEvent:
        "Submitting DESCEND to Chain...",
    }));

    try {
      /*
       * Send DESCEND action to Chain.
       */

      const result =
        await hostApi.submitAction({
          sessionId:
            row.sessionId,

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
      console.error(
        "[Dragon's Hoard] Descend failed:",
        error
      );

      setGame((current) => ({
        ...current,

        waitingForChain: false,

        lastEvent:
          "Chain rejected the descent.",
      }));
    }
  }

  /* =======================================================
     EXTRACT
     ======================================================= */

  async function handleExtract() {
    const hostApi =
      hostRef.current;

    const sessionKey =
      sessionKeyRef.current;

    /*
     * ==========================================
     * STANDALONE / LOCAL DEMO MODE
     * ==========================================
     */

    if (!hostApi || !sessionKey) {
      setGame((current) => {
        const next =
          extract(current);

        return {
          ...next,

          waitingForChain: false,

          lastEvent:
            next.status === "EXTRACTED"
              ? `Local demo: extracted ${next.currentPayout.toFixed(2)} successfully.`
              : next.lastEvent,
        };
      });

      return;
    }

    /* =====================================================
       CHAIN MODE
       ===================================================== */

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

    /*
     * Update local UI.
     */

    setGame((current) => ({
      ...extract(current),

      sessionId:
        row.sessionId,

      waitingForChain: true,

      lastEvent:
        "Submitting extraction request to Chain...",
    }));

    try {
      /*
       * Send EXTRACT action to Chain.
       */

      const result =
        await hostApi.submitAction({
          sessionId:
            row.sessionId,

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
      console.error(
        "[Dragon's Hoard] Extraction failed:",
        error
      );

      setGame((current) => ({
        ...current,

        waitingForChain: false,

        lastEvent:
          "Chain rejected the extraction.",
      }));
    }
  }

  /* =======================================================
     RESET RAID
     ======================================================= */

  function handleReset() {
    /*
     * Clear the temporary Chain session.
     */

    sessionKeyRef.current = null;

    /*
     * Clear Chain-related state.
     */

    hostRef.current = null;

    /*
     * Reset local game.
     */

    setGame((current) =>
      resetRound(current)
    );

    /*
     * Return to clean standalone/entry
     * state without logging the user out.
     */

    setSnapshot(null);
  }

  /* =======================================================
     LOGIN → GAME
     ======================================================= */

  function handleLogin() {
    setScreen("GAME");
  }

  /* =======================================================
     CREATE ACCESS → ONBOARDING
     ======================================================= */

  function handleCreateAccess() {
    setScreen("ONBOARDING");
  }

  /* =======================================================
     ONBOARDING → GAME
     ======================================================= */

  function handleOnboardingComplete() {
    setScreen("GAME");
  }

  /* =======================================================
     AUTH CHECK LOADING
     ======================================================= */

  if (authChecking) {
    return (
      <main className="auth-page">
        <div className="auth-background-glow" />

        <div className="auth-container">
          <div className="auth-brand">
            <div className="auth-dragon">
              🐉
            </div>

            <div className="auth-kicker">
              CHAIN · PRIVATE VAULT
            </div>

            <h1>
              DRAGON&apos;S HOARD
            </h1>

            <p>
              Checking vault access...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     LOGIN SCREEN
     ======================================================= */

  if (screen === "LOGIN") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onCreate={
          handleCreateAccess
        }
      />
    );
  }

  /* =======================================================
     CREATE VAULT SCREEN
     ======================================================= */

  if (screen === "ONBOARDING") {
    return (
      <WalletOnboarding
        onComplete={
          handleOnboardingComplete
        }
      />
    );
  }

  /* =======================================================
     MAIN GAME
     ======================================================= */

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