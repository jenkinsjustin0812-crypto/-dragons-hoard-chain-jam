"use client";

import { useEffect, useState } from "react";

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;

  on?: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;

  removeListener?: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function MetaMaskButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedAccount = window.localStorage.getItem(
      "dragon_hoard_wallet"
    );

    if (savedAccount) {
      setAccount(savedAccount);
    }
  }, []);

  async function connectWallet() {
    setConnecting(true);
    setError(null);

    try {
      // Get the MetaMask browser provider
      const ethereum = window.ethereum;

      if (!ethereum) {
        setError(
          "MetaMask was not detected. Please make sure the MetaMask extension is enabled and refresh this page."
        );

        return;
      }

      // Ask MetaMask for the user's accounts
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setError("No MetaMask account was selected.");
        return;
      }

      const address = accounts[0];

      setAccount(address);

      window.localStorage.setItem(
        "dragon_hoard_wallet",
        address
      );
    } catch (error) {
      console.error("MetaMask connection error:", error);

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number }).code === 4001
      ) {
        setError("MetaMask connection was rejected.");
      } else {
        setError(
          "Could not connect to MetaMask. Please unlock MetaMask and try again."
        );
      }
    } finally {
      setConnecting(false);
    }
  }

  function disconnectWallet() {
    setAccount(null);

    window.localStorage.removeItem(
      "dragon_hoard_wallet"
    );
  }

  if (account) {
    return (
      <div className="wallet-connected">
        <div className="wallet-status">
          <span className="wallet-dot" />

          <div>
            <span className="wallet-label">
              WALLET CONNECTED
            </span>

            <strong>
              {account.slice(0, 6)}...
              {account.slice(-4)}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="wallet-disconnect"
          onClick={disconnectWallet}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <button
        type="button"
        className="wallet-connect"
        onClick={connectWallet}
        disabled={connecting}
      >
        {connecting
          ? "CONNECTING..."
          : "CONNECT METAMASK"}
      </button>

      {error && (
        <p className="wallet-error">
          {error}
        </p>
      )}
    </div>
  );
}