import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";

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
    const accounts = await activeProvider.send("eth_requestAccounts", []);
    await refreshWalletState(createProvider());
    return accounts?.[0] || null;
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
      console.error(err);
      setError(err?.message || "Unable to switch network in MetaMask.");
      throw err;
    } finally {
      setIsSwitching(false);
    }
  };

  const isConnected = Boolean(address);

  return { provider, address, network, connect, disconnect, switchToChain, isConnected, isSwitching, error };
};
