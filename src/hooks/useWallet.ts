import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  balance: string | null;
}

interface WalletError extends Error {
  code?: number;
}

const Pharos_Devnet_Config = {
  chainId: "0xC352",
  chainName: "Pharos Devnet",
  nativeCurrency: {
    name: "PTT",
    symbol: "PTT",
    decimals: 18,
  },
  rpcUrls: ["https://devnet.dplabs-internal.com"],
  blockExplorerUrls: ["https://pharosscan.xyz/"],
};

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    provider: null,
    signer: null,
    chainId: null,
    balance: null,
  });

  const addPharosNetwork = async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [Pharos_Devnet_Config],
      });
      return true;
    } catch (error) {
      console.error('Error adding pharos network:', error);
      return false;
    }
  };

  const switchToPharosNetwork = async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: Pharos_Devnet_Config.chainId }],
      });
      return true;
    } catch (error) {
      const walletError = error as WalletError;
      if (walletError.code === 4902) {
        return addPharosNetwork();
      }
      console.error('Error switching to Pharos network:', error);
      return false;
    }
  };

  const connectWallet = async (): Promise<boolean> => {
    if (!window.ethereum) {
      console.error('Please install MetaMask or another Web3 wallet');
      return false;
    }

    try {
      const networkSwitched = await switchToPharosNetwork();
      if (!networkSwitched) {
        throw new Error('Failed to switch to Pharos network');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[];

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = accounts[0];
      const network = await provider.getNetwork();
      const balance = ethers.utils.formatEther(await provider.getBalance(address));

      setWalletState({
        address,
        isConnected: true,
        provider,
        signer,
        chainId: network.chainId,
        balance,
      });

      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      address: null,
      isConnected: false,
      provider: null,
      signer: null,
      chainId: null,
      balance: null,
    });
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (walletState.address !== accounts[0]) {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: unknown) => {
          if (Array.isArray(accounts) && accounts.length > 0) {
            connectWallet();
          }
        });

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
  };
};

export default useWallet;
