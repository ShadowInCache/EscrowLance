import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  SUPPORTED_CHAIN_HEX,
  SUPPORTED_CHAIN_ID,
  SUPPORTED_CHAIN_NAME,
  RPC_URL,
} from "../config/env.js";

export const useWallet = () => {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState("");

  const createProvider = useCallback(() => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const mapWalletError = useCallback((err) => {
    if (!err) return "Wallet action failed.";
    if (err.code === 4001) return "Wallet action was rejected in MetaMask.";
    if (err.code === -32002) return "MetaMask is already processing a request. Open MetaMask to continue.";
    if (err.code === 4902) return `${SUPPORTED_CHAIN_NAME} is not added in MetaMask.`;
    return err?.message || "Wallet action failed.";
  }, []);

  const refreshWalletState = useCallback(
    async (nextProvider = null) => {
      const activeProvider = nextProvider || createProvider();
      if (!activeProvider) {
        setProvider(null);
        setAddress(null);
        setNetwork(null);
        return null;
      }

      setProvider(activeProvider);
      try {
        const [net, accounts] = await Promise.all([
          activeProvider.getNetwork(),
          activeProvider.send("eth_accounts", []),
        ]);
        setNetwork(net);
        setAddress(accounts?.[0] || null);
      } catch (err) {
        console.error(err);
      }

      return activeProvider;
    },
    [createProvider]
  );

  useEffect(() => {
    if (!window.ethereum) return;
    let isMounted = true;

    const initialize = async () => {
      const initialProvider = createProvider();
      if (!initialProvider || !isMounted) return;
      await refreshWalletState(initialProvider);
    };

    initialize().catch(console.error);

    const handleAccountsChanged = (accounts) => {
      setAddress(accounts?.[0] || null);
    };

    const handleChainChanged = async () => {
      try {
        const nextProvider = createProvider();
        if (!nextProvider) return;
        await refreshWalletState(nextProvider);
      } catch (err) {
        console.error(err);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      isMounted = false;
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [createProvider, refreshWalletState]);

  const connect = async () => {
    const activeProvider = provider || createProvider();
    if (!activeProvider) throw new Error("MetaMask not found");
    setError("");
    try {
      const accounts = await activeProvider.send("eth_requestAccounts", []);
      await refreshWalletState(createProvider());
      return accounts?.[0] || null;
    } catch (err) {
      const message = mapWalletError(err);
      setError(message);
      throw new Error(message);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setError("");
  };

  const switchToChain = async (targetChainIdHex) => {
    if (!window.ethereum) return null;
    setIsSwitching(true);
    setError("");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainIdHex }],
      });

      const refreshedProvider = createProvider();
      if (!refreshedProvider) {
        throw new Error("MetaMask provider unavailable after network switch.");
      }

      await refreshWalletState(refreshedProvider);
      const net = await refreshedProvider.getNetwork();
      const expectedChainId = Number.parseInt(targetChainIdHex, 16);
      if (Number(net.chainId) !== expectedChainId) {
        throw new Error("Network switch did not complete. Please confirm MetaMask network.");
      }

      return net;
    } catch (err) {
      if (err?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainIdHex,
                chainName: SUPPORTED_CHAIN_NAME,
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: RPC_URL ? [RPC_URL] : [],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });

          const refreshedProvider = createProvider();
          if (!refreshedProvider) {
            throw new Error("MetaMask provider unavailable after adding network.");
          }

          await refreshWalletState(refreshedProvider);
          return refreshedProvider.getNetwork();
        } catch (addErr) {
          const addMessage = mapWalletError(addErr);
          setError(addMessage);
          throw new Error(addMessage);
        }
      }

      console.error(err);
      const message = mapWalletError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSwitching(false);
    }
  };

  const isConnected = Boolean(address);
  const isMetaMaskInstalled = Boolean(window.ethereum);
  const isOnSupportedNetwork = network ? Number(network.chainId) === SUPPORTED_CHAIN_ID : false;
  const ensureSupportedNetwork = async () => {
    const activeProvider = provider || createProvider();
    if (!activeProvider) {
      const message = "MetaMask not found";
      setError(message);
      throw new Error(message);
    }

    const current = await activeProvider.getNetwork();
    if (Number(current.chainId) === SUPPORTED_CHAIN_ID) return current;
    return switchToChain(SUPPORTED_CHAIN_HEX);
  };

  return {
    provider,
    address,
    network,
    connect,
    disconnect,
    switchToChain,
    ensureSupportedNetwork,
    isConnected,
    isSwitching,
    isMetaMaskInstalled,
    isOnSupportedNetwork,
    error,
  };
};
