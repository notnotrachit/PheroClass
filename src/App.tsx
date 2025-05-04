import { DashboardRouter } from "./components/DashboardRouter";
import { WalletProvider } from "./context/WalletContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import PWAUpdateNotification from "./components/PWAUpdateNotification";

const queryClient = new QueryClient();

function App() {
  return (
    <div className="min-h-screen bg-background dark">
      <ThirdwebProvider
        clientId="65b5851081b21119251060ea906129f0"
        activeChain="sepolia"
      >
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAUpdateNotification />
              <DashboardRouter />
            </TooltipProvider>
          </WalletProvider>
        </QueryClientProvider>
      </ThirdwebProvider>
      <div className="fixed inset-0 -z-10 h-full w-full bg-[#030712] bg-[radial-gradient(#2A2A3F_1px,transparent_1px)] [background-size:20px_20px]"></div>
      <div className="fixed -z-10 h-[400px] w-[700px] rounded-full bg-indigo-600/20 blur-[100px] top-1/3 -right-40"></div>
      <div className="fixed -z-10 h-[350px] w-[500px] rounded-full bg-purple-600/20 blur-[100px] bottom-0 left-10"></div>
      <div className="fixed -z-10 h-[300px] w-[500px] rounded-full bg-blue-600/20 blur-[100px] top-10 left-1/4"></div>
    </div>
  );
}

export default App;
