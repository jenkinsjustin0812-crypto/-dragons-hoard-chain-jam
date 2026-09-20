"use client";

import { useState } from "react";
import type { GameState } from "@/lib/game/gameState";

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

  const isPlaying = state.status === "PLAYING";
  const isExtracted = state.status === "EXTRACTED";
  const isLost = state.status === "LOST";

  return (
    <main className="game-page">
      <div className="hoard-panel">

        {/* HEADER */}
        <header className="hoard-header">
          <div>
            <div className="eyebrow">
              CHAIN CASINO · EXTRACTION PROTOCOL
            </div>

            <h1>DRAGON'S HOARD</h1>

            <p className="subtitle">
              Enter the vault. Read the market. Descend deeper.
              Extract before the Dragon claims your wager.
            </p>
          </div>

          <div className="balance">
            <span>AVAILABLE BALANCE</span>
            <strong>{state.balance.toFixed(2)} chUSD</strong>
          </div>
        </header>

        {/* ENTRY */}
        {!isPlaying && !isExtracted && !isLost && (
          <section className="market-card entry-card">
            <div className="market-title">
              <span>VAULT ENTRY</span>
              <span className="status-ready">● READY</span>
            </div>

            <h2>Prepare Your Raid</h2>

            <p className="muted">
              Choose your wager before entering the Dragon's vault.
            </p>

            <div className="wager-row">
              <div className="wager-box">
                <span>WAGER</span>

                <input
                  type="number"
                  min="1"
                  value={wagerInput}
                  onChange={(e) => setWagerInput(e.target.value)}
                />

                <small>chUSD</small>
              </div>

              <button
                className="extract-button"
                onClick={() => onStart(Number(wagerInput))}
              >
                START RAID
              </button>
            </div>
          </section>
        )}

        {/* ACTIVE VAULT */}
        {isPlaying && (
          <>
            <section className="vault-card">
              <div className="vault-top">
                <div>
                  <span>VAULT DEPTH</span>
                  <strong>FLOOR {state.floor}</strong>
                </div>

                <div className="danger-indicator">
                  <span>RISK LEVEL</span>
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
                <div className="dragon-symbol">🐉</div>

                <div className="multiplier">
                  {state.multiplier.toFixed(2)}x
                </div>

                <span className="multiplier-label">
                  CURRENT MULTIPLIER
                </span>
              </div>

              <div className="payout">
                <span>CURRENT EXTRACTION VALUE</span>
                <strong>
                  {state.currentPayout.toFixed(2)} chUSD
                </strong>
              </div>
            </section>

            {/* MARKET */}
            <section className="market-card">
              <div className="market-title">
                <span>MARKET INTELLIGENCE</span>
                <span className="status-live">● LIVE</span>
              </div>

              <div className="market-heading">
                <div>
                  <span className="muted">RESOURCE</span>
                  <h2>{state.market.resource}</h2>
                </div>

                <div className="trend">
                  ▲ {state.market.trend}
                </div>
              </div>

              <div className="market-grid">
                <div>
                  <span>SUPPLY</span>
                  <strong>{state.market.supply}</strong>
                </div>

                <div>
                  <span>DEMAND</span>
                  <strong>{state.market.demand}</strong>
                </div>

                <div>
                  <span>MARKET VALUE</span>
                  <strong>
                    {state.market.price}
                  </strong>
                </div>
              </div>

              <div className="intel-note">
                <span>INTELLIGENCE</span>
                <strong>
                  Demand currently exceeds available supply.
                </strong>
              </div>
            </section>

            {/* ACTIONS */}
            <section className="actions">
              <button
                className="extract-button"
                onClick={onExtract}
              >
                EXTRACT
                <small>
                  Secure {state.currentPayout.toFixed(2)} chUSD
                </small>
              </button>

              <button
                className="descend-button"
                onClick={onDescend}
              >
                DESCEND DEEPER
                <small>
                  Increase potential payout
                </small>
              </button>
            </section>
          </>
        )}

        {/* EXTRACTION RESULT */}
        {isExtracted && (
          <section className="result-card success-card">
            <div className="result-icon">◆</div>

            <span>RAID COMPLETE</span>

            <h2>HOARD EXTRACTED</h2>

            <p>
              You escaped the vault with your accumulated
              extraction value.
            </p>

            <strong className="result-value">
              +{state.currentPayout.toFixed(2)} chUSD
            </strong>

            <button
              className="extract-button"
              onClick={onReset}
            >
              START NEW RAID
            </button>
          </section>
        )}

        {/* LOSS RESULT */}
        {isLost && (
          <section className="result-card loss-card">
            <div className="result-icon">✕</div>

            <span>VAULT BREACH</span>

            <h2>THE DRAGON CLAIMED THE HOARD</h2>

            <p>
              The vault became unstable before extraction.
              Your wager was lost.
            </p>

            <strong className="result-value">
              0.00 chUSD
            </strong>

            <button
              className="descend-button"
              onClick={onReset}
            >
              TRY ANOTHER RAID
            </button>
          </section>
        )}

        {/* EVENT LOG */}
        {state.lastEvent && (
          <div className="event">
            <span>VAULT LOG</span>
            {state.lastEvent}
          </div>
        )}

        {/* FOOTER */}
        <footer className="game-footer">
          <span>DRAGON'S HOARD</span>
          <span>CHAIN CASINO PROTOCOL</span>
          <span>VRF-SECURED OUTCOMES</span>
        </footer>

      </div>
    </main>
  );
}