import { WalletConnect } from "@/components/WalletConnect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            PheroClass
          </h1>
          <WalletConnect />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                Welcome to PheroClass
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Connect your wallet to start managing attendance with
                blockchain-powered security and transparency.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
