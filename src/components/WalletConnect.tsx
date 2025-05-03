import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Wallet } from "lucide-react";

// Pharos Testnet configuration
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

export const WalletConnect = () => {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const { toast } = useToast();

  const switchToPharosNetwork = async (provider: ethers.providers.Web3Provider) => {
    try {
      // Try to switch to Pharos Testnet
      await provider.send("wallet_switchEthereumChain", [
        { chainId: Pharos_Devnet_Config.chainId },
      ]);
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await provider.send("wallet_addEthereumChain", [Pharos_Devnet_Config]);
        } catch (addError) {
          console.error("Error adding Pharos network:", addError);
          toast({
            variant: "destructive",
            title: "Network Error",
            description: "Failed to add Pharos Testnet",
          });
        }
      } else {
        console.error("Error switching network:", switchError);
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Failed to switch to Pharos Testnet",
        });
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast({
          variant: "destructive",
          title: "Wallet Not Found",
          description: "Please install MetaMask or another Web3 wallet",
        });
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        setAccountId(account);
        setConnected(true);
        
        // Switch to Pharos Testnet after connecting
        await switchToPharosNetwork(provider);
        
        toast({
          title: "Wallet Connected",
          description: `Connected with account: ${account.slice(0, 6)}...${account.slice(-4)}`,
        });
      }

    } catch (error) {
      console.error("Connection error:", error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Failed to connect to wallet",
      });
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        try {
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccountId(accounts[0]);
            setConnected(true);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccountId(accounts[0]);
          setConnected(true);
        } else {
          setAccountId("");
          setConnected(false);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);

  return (
    <Button
      onClick={connectWallet}
      className="gap-2"
      variant={connected ? "outline" : "default"}
    >
      <Wallet className="h-4 w-4" />
      {connected ? `Connected: ${accountId.slice(0, 6)}...${accountId.slice(-4)}` : "Connect Wallet"}
    </Button>
  );
};