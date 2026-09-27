"use client";

import { useEffect, useState } from "react";
import RunePuzzle from "./RunePuzzle";
import VaultChallenge from "./VaultChallenge";
import type { GameState } from "@/lib/game/gameState";
import MetaMaskButton from "../wallet/MetaMaskButton";

interface HoardPanelProps {
  state: GameState;
  onStart: (wager: number) => void;
  onExtract: () => void;
  onDescend: () => void;
  onReset: () => void;
}

export default function HoardPanel({
  state,
  onStart,
  onExtract,
  onDescend,
  onReset,
}: HoardPanelProps) {
  const [wagerInput, setWagerInput] = useState("10");

  const [aiAnalysis, setAiAnalysis] = useState<{
    marketStatus: string;
    resource: string;
    price: number;
    supply: number;
    demand: number;
    demandGap: number;
    trend: string;
    floor: number;
    multiplier: number;
    riskLevel: string;
    riskNote: string;
    decision: string;
    security: string;
  } | null>(null);

  const [aiLoading, setAiLoading] = useState(false);

  // Rune puzzle state
  const [runeSolved, setRuneSolved] = useState(false);
  const [challengeSolved, setChallengeSolved] = useState(false);

  // Every new floor gets a new puzzle.
  useEffect(() => {
    setRuneSolved(false);
    setChallengeSolved(false);
  }, [state.floor]);

  async function askDragonEconomist() {
    setAiLoading(true);
    setAiAnalysis(null);

    try {
      const response = await fetch("/api/dragon-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          floor: state.floor,
          multiplier: state.multiplier,
          supply: state.market.supply,
          demand: state.market.demand,
          price: state.market.price,
          trend: state.market.trend,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
      }
    } catch (error) {
      console.error(
        "Dragon Economist error:",
        error
      );

      setAiAnalysis(null);
    } finally {
      setAiLoading(false);
    }
  }

  const isPlaying =
    state.status === "PLAYING";

  const isExtracted =
    state.status === "EXTRACTED";

  const isLost =
    state.status === "LOST";

  function handleStart() {
    const wager = Number(wagerInput);

    if (!Number.isFinite(wager) || wager <= 0) {
      return;
    }

    onStart(wager);
  }

  return (
    <>
      <style jsx>{`
        @keyframes hoardFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-7px) scale(1.02); }
        }

        @keyframes hoardGlow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(214,168,73,0.18)); }
          50% { filter: drop-shadow(0 0 18px rgba(214,168,73,0.55)); }
        }

        @keyframes hoardPulse {
          0%, 100% { opacity: 0.72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.035); }
        }

        @keyframes hoardRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes hoardShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .hoard-dragon-float {
          animation: hoardFloat 3.2s ease-in-out infinite,
                     hoardGlow 3.2s ease-in-out infinite;
          transform-origin: center;
        }

        .hoard-dragon-pulse {
          animation: hoardPulse 2.4s ease-in-out infinite;
          transform-origin: center;
        }

        .hoard-card-enter {
          animation: hoardRise 0.45s ease-out both;
        }

        .hoard-shimmer-button {
          background-image: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255,255,255,0.08) 45%,
            transparent 55%
          );
          background-size: 220% 100%;
          animation: hoardShimmer 3.5s linear infinite;
        }

        .hoard-result-enter {
          animation: hoardRise 0.55s ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .hoard-dragon-float,
          .hoard-dragon-pulse,
          .hoard-card-enter,
          .hoard-shimmer-button,
          .hoard-result-enter {
            animation: none !important;
          }
        }
      `}</style>

      <main className="game-page">
      <div className="hoard-panel">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="hoard-header">

          <div className="brand-block">

            <div className="eyebrow">
              CHAIN CASINO · EXTRACTION PROTOCOL
            </div>

            <h1>DRAGON&apos;S HOARD</h1>

            <p className="subtitle">
              Enter the vault. Read the market.
              Descend deeper. Extract before the
              Dragon claims your wager.
            </p>

          </div>

          <div className="balance">

            <span>
              AVAILABLE BALANCE
            </span>

            <strong>
              {state.balance.toFixed(2)} chUSD
            </strong>

          </div>

        </header>

        {/* =====================================================
            ENTRY SCREEN
        ===================================================== */}

        {!isPlaying &&
          !isExtracted &&
          !isLost && (
            <section className="entry-screen">

              {/* TOP LABEL */}

              <div className="entry-topline">

                <span>
                  VAULT ACCESS PROTOCOL
                </span>

                <span className="entry-live">
                  ● SYSTEM READY
                </span>

              </div>

              {/* HERO */}

              <div className="entry-hero">

                <div className="dragon-emblem hoard-dragon-float">
                  🐉
                </div>

                <div className="entry-kicker">
                  THE DRAGON&apos;S VAULT
                </div>

                <h2>
                  PREPARE YOUR RAID
                </h2>

                <p>
                  Every descent increases the
                  value of your extraction.
                  Every floor brings greater risk.
                </p>

              </div>

              {/* RAID PANEL */}

              <div className="raid-entry-panel">

                <div className="entry-section-label">
                  RAID PARAMETERS
                </div>

                {/* WAGER */}

                <div className="wager-field">

                  <div className="wager-label-row">

                    <span>
                      RAID WAGER
                    </span>

                    <span>
                      AVAILABLE{" "}
                      {state.balance.toFixed(2)}
                    </span>

                  </div>

                  <div className="wager-input-wrapper">

                    <input
                      type="number"
                      min="1"
                      value={wagerInput}
                      onChange={(e) =>
                        setWagerInput(
                          e.target.value
                        )
                      }
                    />

                    <span>
                      chUSD
                    </span>

                  </div>

                </div>

                {/* WALLET */}

                <div className="wallet-entry">

                  <div className="entry-section-label">
                    VAULT WALLET
                  </div>

                  <MetaMaskButton />

                </div>

                {/* START */}

                <button
                  type="button"
                  className="vault-entry-button hoard-shimmer-button"
                  onClick={handleStart}
                >

                  <span>
                    ENTER THE VAULT
                  </span>

                  <span className="button-arrow">
                    →
                  </span>

                </button>

                {/* SECURITY */}

                <div className="entry-security">

                  <span>
                    ⛓
                  </span>

                  <div>

                    <strong>
                      CHAIN-SECURED RAID
                    </strong>

                    <p>
                      Random outcomes are determined
                      by Chain VRF. The Dragon Economist
                      provides intelligence only.
                    </p>

                  </div>

                </div>

              </div>

              {/* ENTRY FOOTER */}

              <div className="entry-footer">

                <span>
                  VRF SECURED
                </span>

                <span>•</span>

                <span>
                  NON-CUSTODIAL
                </span>

                <span>•</span>

                <span>
                  CHAIN SETTLEMENT
                </span>

              </div>

            </section>
          )}

        {/* =====================================================
            ACTIVE VAULT
        ===================================================== */}

        {isPlaying && (
          <>

            {/* VAULT STATUS */}

            <section className="vault-card hoard-card-enter">

              <div className="vault-top">

                <div>
                  <span>
                    VAULT DEPTH
                  </span>

                  <strong>
                    FLOOR {state.floor}
                  </strong>
                </div>

                <div className="danger-indicator">

                  <span>
                    RISK LEVEL
                  </span>

                  <strong>
                    {state.floor <= 2
                      ? "LOW"
                      : state.floor <= 4
                      ? "ELEVATED"
                      : "CRITICAL"}
                  </strong>

                </div>

              </div>

              <div className="vault-center">

                <div className="dragon-symbol hoard-dragon-pulse">
                  🐉
                </div>

                <div className="multiplier">
                  {state.multiplier.toFixed(2)}x
                </div>

                <span className="multiplier-label">
                  CURRENT MULTIPLIER
                </span>

              </div>

              <div className="payout">

                <span>
                  CURRENT EXTRACTION VALUE
                </span>

                <strong>
                  {state.currentPayout.toFixed(2)} chUSD
                </strong>

              </div>

            </section>

            {/* MARKET */}

            <section className="market-card hoard-card-enter">

              <div className="market-title">

                <span>
                  MARKET INTELLIGENCE
                </span>

                <span className="status-live">
                  ● LIVE
                </span>

              </div>

              <div className="market-heading">

                <div>

                  <span className="muted">
                    RESOURCE
                  </span>

                  <h2>
                    {state.market.resource}
                  </h2>

                </div>

                <div className="trend">
                  ▲ {state.market.trend}
                </div>

              </div>

              <div className="market-grid">

                <div>
                  <span>SUPPLY</span>
                  <strong>
                    {state.market.supply}
                  </strong>
                </div>

                <div>
                  <span>DEMAND</span>
                  <strong>
                    {state.market.demand}
                  </strong>
                </div>

                <div>
                  <span>MARKET VALUE</span>
                  <strong>
                    {state.market.price}
                  </strong>
                </div>

              </div>

              <div className="intel-note">

                <span>
                  INTELLIGENCE
                </span>

                <strong>
                  Demand currently exceeds
                  available supply.
                </strong>

              </div>

            </section>

            {/* =================================================
                DRAGON ECONOMIST
            ================================================= */}

            <section className="market-card dragon-economist hoard-card-enter">

              <div className="market-title">

                <span>
                  🐉 DRAGON ECONOMIST
                </span>

                <span className="status-live">
                  ● AI INTELLIGENCE
                </span>

              </div>

              <h2>
                Vault Market Analysis
              </h2>

              <p className="muted">
                Analyze market conditions before
                making your next vault decision.
              </p>

              <button
                type="button"
                className="descend-button"
                onClick={askDragonEconomist}
                disabled={aiLoading}
              >
                {aiLoading
                  ? "ANALYZING MARKET..."
                  : "ASK DRAGON ECONOMIST"}
              </button>

              {aiAnalysis && (
                <div className="dragon-analysis">

                  <div className="analysis-header">

                    <span>
                      MARKET STATUS
                    </span>

                    <strong>
                      {aiAnalysis.marketStatus}
                    </strong>

                  </div>

                  <div className="analysis-grid">

                    <div>
                      <span>RESOURCE</span>
                      <strong>
                        {aiAnalysis.resource}
                      </strong>
                    </div>

                    <div>
                      <span>PRICE</span>
                      <strong>
                        {aiAnalysis.price} chUSD
                      </strong>
                    </div>

                    <div>
                      <span>SUPPLY</span>
                      <strong>
                        {aiAnalysis.supply}
                      </strong>
                    </div>

                    <div>
                      <span>DEMAND</span>
                      <strong>
                        {aiAnalysis.demand}
                      </strong>
                    </div>

                  </div>

                  <div className="analysis-block">

                    <span>
                      VAULT STATUS
                    </span>

                    <div className="vault-analysis">

                      <strong>
                        FLOOR {aiAnalysis.floor}
                      </strong>

                      <strong>
                        {aiAnalysis.multiplier.toFixed(2)}×
                      </strong>

                      <strong>
                        {aiAnalysis.riskLevel}
                      </strong>

                    </div>

                  </div>

                  <div className="analysis-block">

                    <span>
                      RISK NOTE
                    </span>

                    <p>
                      {aiAnalysis.riskNote}
                    </p>

                  </div>

                  <div className="analysis-block">

                    <span>
                      PLAYER DECISION
                    </span>

                    <p>
                      {aiAnalysis.decision}
                    </p>

                  </div>

                  <div className="analysis-security">

                    <span>
                      ⛓ CHAIN SECURITY
                    </span>

                    <p>
                      {aiAnalysis.security}
                    </p>

                  </div>

                </div>
              )}

              <small className="muted">
                AI provides intelligence only.
                Chain VRF determines the actual
                game outcome.
              </small>

            </section>

            {/* =================================================
                VAULT RUNE PUZZLE
            ================================================= */}

            <VaultChallenge
              floor={state.floor}
              onCompleted={() => setChallengeSolved(true)}
            />

            <RunePuzzle
              floor={state.floor}
              onSolved={() => setRuneSolved(true)}
            />

            {/* =================================================
                ACTIONS
            ================================================= */}

            <section className="actions">

              <button
                type="button"
                className="extract-button hoard-shimmer-button"
                onClick={onExtract}
              >

                EXTRACT

                <small>
                  Secure{" "}
                  {state.currentPayout.toFixed(2)} chUSD
                </small>

              </button>

              <button
                type="button"
                className="descend-button"
                onClick={onDescend}
                disabled={!runeSolved || !challengeSolved}
                style={{
                  opacity: runeSolved && challengeSolved ? 1 : 0.45,
                  cursor: runeSolved && challengeSolved
                    ? "pointer"
                    : "not-allowed",
                }}
              >

                {runeSolved
                  ? "DESCEND DEEPER"
                  : "SOLVE RUNE FIRST"}

                <small>
                  {runeSolved
                    ? "Increase potential payout"
                    : "Unlock the vault path"}
                </small>

              </button>

            </section>

          </>
        )}

        {/* =====================================================
            SUCCESS
        ===================================================== */}

        {isExtracted && (
          <section className="result-card success-card hoard-result-enter">

            <div className="result-icon">
              ◆
            </div>

            <span>
              RAID COMPLETE
            </span>

            <h2>
              HOARD EXTRACTED
            </h2>

            <p>
              You escaped the vault with your
              accumulated extraction value.
            </p>

            <strong className="result-value">
              +{state.currentPayout.toFixed(2)} chUSD
            </strong>

            <button
              type="button"
              className="extract-button hoard-shimmer-button"
              onClick={onReset}
            >
              START NEW RAID
            </button>

          </section>
        )}

        {/* =====================================================
            LOSS
        ===================================================== */}

        {isLost && (
          <section className="result-card loss-card hoard-result-enter">

            <div className="result-icon">
              ✕
            </div>

            <span>
              VAULT BREACH
            </span>

            <h2>
              THE DRAGON CLAIMED THE HOARD
            </h2>

            <p>
              The vault became unstable before
              extraction. Your wager was lost.
            </p>

            <strong className="result-value">
              0.00 chUSD
            </strong>

            <button
              type="button"
              className="descend-button"
              onClick={onReset}
            >
              TRY ANOTHER RAID
            </button>

          </section>
        )}

        {/* =====================================================
            EVENT LOG
        ===================================================== */}

        {state.lastEvent && (
          <div className="event">

            <span>
              VAULT LOG
            </span>

            {state.lastEvent}

          </div>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="game-footer">

          <span>
            DRAGON&apos;S HOARD
          </span>

          <span>
            CHAIN CASINO PROTOCOL
          </span>

          <span>
            VRF-SECURED OUTCOMES
          </span>

        </footer>

      </div>
    </main>
    </>
  );
}