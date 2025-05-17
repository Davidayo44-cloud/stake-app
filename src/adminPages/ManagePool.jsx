import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { DollarSign, ArrowRight, X } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { Toaster, toast } from "react-hot-toast";
import ReactModal from "react-modal";
import { ethers } from "ethers";
import { MockUSDTABI, USDTABI, StakingContractABI } from "../config/abis";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
  VITE_ABI_PATH: import.meta.env.VITE_ABI_PATH,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "ManagePool.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

const {
  VITE_THIRDWEB_CLIENT_ID,
  VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_DECIMALS,
  VITE_ABI_PATH,
} = requiredEnvVars;

// Validate contract addresses
if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "ManagePool.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "ManagePool.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID and decimals
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("ManagePool.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const decimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(decimals) || decimals < 0) {
  console.error(
    "ManagePool.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}
const USDT_DECIMALS = parseInt(VITE_USDT_DECIMALS, 10);
if (isNaN(USDT_DECIMALS) || USDT_DECIMALS < 0) {
  console.error("ManagePool.jsx: Invalid USDT decimals:", VITE_USDT_DECIMALS);
  throw new Error("Invalid USDT decimals");
}

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: VITE_THIRDWEB_CLIENT_ID,
});

// Define Hardhat chain
const hardhatChain = defineChain({
  id: chainId,
  rpc: VITE_RPC_URL,
  nativeCurrency: {
    name: VITE_NATIVE_CURRENCY_NAME,
    symbol: VITE_NATIVE_CURRENCY_SYMBOL,
    decimals,
  },
  blockExplorers: [],
});

// Initialize contracts
const usdtContract = getContract({
  client,
  chain: hardhatChain,
  address: VITE_USDT_ADDRESS,
  abi: USDTABI,
  rpcOverride: VITE_RPC_URL,
});

const stakingContract = getContract({
  client,
  chain: hardhatChain,
  address: VITE_STAKING_ADDRESS,
  abi: StakingContractABI,
  rpcOverride: VITE_RPC_URL,
});

// Utility function to truncate address
const truncateAddress = (address) => {
  if (!address || !ethers.isAddress(address)) return "Invalid address";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format USDT
const formatUSDT = (value) => {
  if (!value) return "0.00";
  return (Number(value) / 10 ** USDT_DECIMALS).toFixed(2);
};

// Card animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.1 },
  }),
  hover: { scale: 1.05, boxShadow: "0 0 20px rgba(14, 116, 144, 0.3)" },
};

// Modal animation variants
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// Error boundary component
function ErrorFallback({ error }) {
  console.error("ManagePool.jsx: ErrorFallback:", {
    message: error.message,
    stack: error.stack,
  });
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
      <div className="text-center p-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 font-geist">
          Something went wrong
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 text-sm sm:text-base font-geist"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function ManagePool() {
  const [depositAmount, setDepositAmount] = useState("");
  const [externalAddress, setExternalAddress] = useState("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState({
    deposit: false,
    withdraw: false,
  });
  const account = useActiveAccount();

  // Log account state
  console.log("ManagePool.jsx: Component rendered", {
    account: account ? { address: account.address } : null,
    accountAddress: account?.address,
    isAccountValid: !!account && ethers.isAddress(account?.address),
  });

  // Contract data hooks
  const {
    data: rewardPoolBalance,
    isLoading: isRewardPoolLoading,
    error: rewardPoolError,
    refetch: refetchRewardPool,
  } = useReadContract({
    contract: stakingContract,
    method: "rewardPoolBalance",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

 const {
    data: contractBalance,
    error: contractBalanceError,
    isLoading: isContractBalanceLoading,
    refetch: refetchContractBalance,
  } = useReadContract({
    contract: usdtContract,
    method: "balanceOf",
    params: [VITE_STAKING_ADDRESS],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });


  const {
    data: isPaused,
    isLoading: isPausedLoading,
    error: pausedError,
    refetch: refetchPaused,
  } = useReadContract({
    contract: stakingContract,
    method: "paused",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  const {
    data: adminAddress,
    isLoading: isAdminLoading,
    error: adminError,
    refetch: refetchAdmin,
  } = useReadContract({
    contract: stakingContract,
    method: "admin",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  // Check if user is admin
  const isAdmin =
    account?.address &&
    adminAddress &&
    account.address.toLowerCase() === adminAddress.toLowerCase();

  // Data fetching
  useEffect(() => {
    console.log("ManagePool.jsx: useEffect for data fetching triggered");
    ReactModal.setAppElement("#root");
    const updateData = async () => {
      setIsLoading(true);
      try {
        if (
          isRewardPoolLoading ||
          isContractBalanceLoading ||
          isPausedLoading ||
          isAdminLoading
        ) {
          return;
        }
        console.log("ManagePool.jsx: updateData: Data fetched", {
          rewardPoolBalance,
          contractBalance,
          isPaused,
          adminAddress,
        });
        setIsLoading(false);
      } catch (err) {
        console.error("ManagePool.jsx: updateData error:", {
          message: err.message,
          stack: err.stack,
        });
        setError(err);
        setIsLoading(false);
      }
    };
    updateData();
  }, [
    rewardPoolBalance,
    contractBalance,
    isPaused,
    adminAddress,
    isRewardPoolLoading,
    isContractBalanceLoading,
    isPausedLoading,
    isAdminLoading,
  ]);

  // Handle errors
  useEffect(() => {
    console.log("ManagePool.jsx: useEffect for error handling triggered");
    if (rewardPoolError) {
      console.error("ManagePool.jsx: rewardPoolError:", {
        message: rewardPoolError.message,
        stack: rewardPoolError.stack,
      });
      toast.error(`Failed to fetch reward pool: ${rewardPoolError.message}`);
      setError(rewardPoolError);
    }
    if (contractBalanceError) {
      console.error("ManagePool.jsx: contractBalanceError:", {
        message: contractBalanceError.message,
        stack: contractBalanceError.stack,
      });
      toast.error(
        `Failed to fetch contract balance: ${contractBalanceError.message}`
      );
      setError(contractBalanceError);
    }
    if (pausedError) {
      console.error("ManagePool.jsx: pausedError:", {
        message: pausedError.message,
        stack: pausedError.stack,
      });
      toast.error(`Failed to fetch pause status: ${pausedError.message}`);
      setError(pausedError);
    }
    if (adminError) {
      console.error("ManagePool.jsx: adminError:", {
        message: adminError.message,
        stack: adminError.stack,
      });
      toast.error(`Failed to fetch admin address: ${adminError.message}`);
      setError(adminError);
    }
  }, [rewardPoolError, contractBalanceError, pausedError, adminError]);

  // Handle deposit to reward pool
  const handleDepositRewardPool = async () => {
    console.log("ManagePool.jsx: handleDepositRewardPool called", {
      accountAddress: account?.address,
      amount: depositAmount,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error(
        "ManagePool.jsx: handleDepositRewardPool: Invalid account",
        {
          account,
          accountAddress: account?.address,
        }
      );
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (!isAdmin) {
      console.error(
        "ManagePool.jsx: handleDepositRewardPool: Not admin account",
        {
          accountAddress: account.address,
          adminAddress,
        }
      );
      toast.error("Only the admin can deposit to reward pool");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      console.error("ManagePool.jsx: handleDepositRewardPool: Invalid amount", {
        depositAmount,
      });
      toast.error("Enter a valid amount");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, deposit: true }));
    const toastId = toast.loading(`Depositing ${amount} USDT...`);
    try {
      const amountWei = ethers.parseUnits(amount.toString(), USDT_DECIMALS);
      console.log("ManagePool.jsx: Amount in Wei:", amountWei.toString());

      // Check balance and allowance using ethers.js
      const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
      const usdt = new ethers.Contract(VITE_USDT_ADDRESS, USDTABI, provider);
      const balance = await usdt.balanceOf(account.address);
      const allowance = await usdt.allowance(
        account.address,
        VITE_STAKING_ADDRESS
      );
      console.log(
        "ManagePool.jsx: USDT Balance:",
        ethers.formatUnits(balance, USDT_DECIMALS)
      );
      console.log(
        "ManagePool.jsx: Allowance:",
        ethers.formatUnits(allowance, USDT_DECIMALS)
      );

      if (balance < amountWei) {
        console.error(
          "ManagePool.jsx: handleDepositRewardPool: Insufficient USDT balance",
          {
            balance,
            required: amountWei,
          }
        );
        throw new Error(
          `Insufficient USDT balance: ${ethers.formatUnits(
            balance,
            USDT_DECIMALS
          )} USDT`
        );
      }

      if (allowance < amountWei) {
        // Approve USDT
        const usdtInterface = new ethers.Interface(USDTABI);
        const approveData = usdtInterface.encodeFunctionData("approve", [
          VITE_STAKING_ADDRESS,
          amountWei,
        ]);
        if (!approveData || approveData === "0x") {
          console.error(
            "ManagePool.jsx: handleDepositRewardPool: Invalid approve encoded data"
          );
          throw new Error(
            "Failed to encode approve transaction. Verify MockUSDT ABI."
          );
        }

        const approveTx = {
          to: VITE_USDT_ADDRESS,
          data: approveData,
          value: "0",
          gasPrice: ethers.parseUnits("5", "gwei"), // Prevent high gas fee
        };
        console.log(
          "ManagePool.jsx: handleDepositRewardPool: Sending approve transaction",
          approveTx
        );
        await account.sendTransaction(approveTx);
        console.log(
          "ManagePool.jsx: handleDepositRewardPool: Approve transaction sent successfully"
        );
      }

      // Deposit to reward pool
      const stakingInterface = new ethers.Interface(StakingContractABI);
      const depositData = stakingInterface.encodeFunctionData(
        "depositRewardPool",
        [amountWei]
      );
      if (!depositData || depositData === "0x") {
        console.error(
          "ManagePool.jsx: handleDepositRewardPool: Invalid deposit encoded data"
        );
        throw new Error(
          "Failed to encode deposit transaction. Verify StakingContract ABI."
        );
      }

      const depositTx = {
        to: VITE_STAKING_ADDRESS,
        data: depositData,
        value: "0",
        gasPrice: ethers.parseUnits("5", "gwei"), // Prevent high gas fee
        gasLimit: 100000, // Reasonable limit
      };
      console.log(
        "ManagePool.jsx: handleDepositRewardPool: Sending deposit transaction",
        depositTx
      );
      await account.sendTransaction(depositTx);
      console.log(
        "ManagePool.jsx: handleDepositRewardPool: Deposit transaction sent successfully"
      );

      toast.success(`Deposited ${amount} USDT to reward pool!`, {
        id: toastId,
      });
      setDepositAmount("");
      await Promise.all([refetchRewardPool(), refetchContractBalance()]);
    } catch (err) {
      console.error("ManagePool.jsx: handleDepositRewardPool error:", {
        message: err.message,
        stack: err.stack,
        accountAddress: account?.address,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, deposit: false }));
      console.log("ManagePool.jsx: handleDepositRewardPool completed");
    }
  };

  // Handle emergency withdrawal
  const handleWithdrawAllFunds = async () => {
    console.log("ManagePool.jsx: handleWithdrawAllFunds called", {
      accountAddress: account?.address,
      externalAddress,
      amount: contractBalance,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("ManagePool.jsx: handleWithdrawAllFunds: Invalid account", {
        account,
        accountAddress: account?.address,
      });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (!isAdmin) {
      console.error(
        "ManagePool.jsx: handleWithdrawAllFunds: Not admin account",
        {
          accountAddress: account.address,
          adminAddress,
        }
      );
      toast.error("Only the admin can perform emergency withdrawal");
      return;
    }

    if (!ethers.isAddress(externalAddress)) {
      console.error(
        "ManagePool.jsx: handleWithdrawAllFunds: Invalid external address",
        {
          externalAddress,
        }
      );
      toast.error("Please enter a valid wallet address");
      return;
    }

    if (!isPaused) {
      console.error(
        "ManagePool.jsx: handleWithdrawAllFunds: Contract not paused",
        {
          isPaused,
        }
      );
      toast.error("Contract must be paused to withdraw");
      return;
    }

    if (!contractBalance || Number(contractBalance) <= 0) {
      console.error(
        "ManagePool.jsx: handleWithdrawAllFunds: No funds available",
        {
          contractBalance,
        }
      );
      toast.error("No funds available to withdraw");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, withdraw: true }));
    const toastId = toast.loading(
      `Withdrawing ${formatUSDT(contractBalance)} USDT...`
    );
    try {
      const stakingInterface = new ethers.Interface(StakingContractABI);
      const encodedData = stakingInterface.encodeFunctionData(
        "withdrawAllFundsTo",
        [externalAddress, contractBalance]
      );

      if (!encodedData || encodedData === "0x") {
        console.error(
          "ManagePool.jsx: handleWithdrawAllFunds: Invalid encoded data"
        );
        throw new Error(
          "Failed to encode transaction. Verify StakingContract ABI."
        );
      }

      const transaction = {
        to: VITE_STAKING_ADDRESS,
        data: encodedData,
        value: "0",
      };
      console.log(
        "ManagePool.jsx: handleWithdrawAllFunds: Sending transaction",
        transaction
      );
      await account.sendTransaction(transaction);
      console.log(
        "ManagePool.jsx: handleWithdrawAllFunds: Transaction sent successfully"
      );

      toast.success(
        `Withdrew ${formatUSDT(
          contractBalance
        )} USDT to ${externalAddress.slice(0, 6)}...${externalAddress.slice(
          -4
        )}!`,
        { id: toastId }
      );
      setExternalAddress("");
      setIsWithdrawModalOpen(false);
      await refetchContractBalance();
    } catch (err) {
      console.error("ManagePool.jsx: handleWithdrawAllFunds error:", {
        message: err.message,
        stack: err.stack,
        accountAddress: account?.address,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, withdraw: false }));
      console.log("ManagePool.jsx: handleWithdrawAllFunds completed");
    }
  };

  // Admin access check
  if (
    account?.address &&
    adminAddress &&
    account.address.toLowerCase() !== adminAddress.toLowerCase()
  ) {
    console.log("ManagePool.jsx: Access denied", {
      connectedAddress: account.address,
      adminAddress,
    });
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
        <div className="text-center p-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 font-geist">
            Access Denied
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
            Only the admin address ({truncateAddress(adminAddress)}) can access
            this page.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (
    isLoading ||
    isRewardPoolLoading ||
    isContractBalanceLoading ||
    isPausedLoading ||
    isAdminLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  console.log("ManagePool.jsx: Rendering UI", {
    adminAddress,
    isPaused,
    rewardPoolBalance,
    contractBalance,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-cyan-700/10 to-transparent">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold text-slate-200 mb-6 sm:mb-8 font-geist"
      >
        Manage Reward Pool
      </motion.h2>

      {/* Pool Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[
          {
            icon: DollarSign,
            label: "Reward Pool Balance",
            value: `$${formatUSDT(rewardPoolBalance)}`,
            tooltip: "USDT available for rewards",
          },
          {
            icon: DollarSign,
            label: "Contract Balance",
            value: `$${formatUSDT(contractBalance)}`,
            tooltip: "Total USDT in the contract",
          },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            variants={cardVariants}
            initial="initial"
            animate={cardVariants.animate(index)}
            whileHover="hover"
            className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-700/30 flex items-center space-x-4"
            data-tooltip-id="card-tooltip"
            data-tooltip-content={item.tooltip}
          >
            <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
                {item.label}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white font-geist">
                {item.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Deposit Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-700/30 mb-6 sm:mb-8"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4 font-geist">
          Deposit to Reward Pool
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Enter USDT amount"
            className="flex-1 bg-slate-800 text-white border border-cyan-700/30 rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-600 font-geist-mono"
          />
          <button
            onClick={() => {
              console.log("ManagePool.jsx: Deposit button clicked");
              handleDepositRewardPool();
            }}
            disabled={isActionLoading.deposit || !isAdmin}
            className={`group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base font-geist ${
              isActionLoading.deposit || !isAdmin
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            data-tooltip-id="action-tooltip"
            data-tooltip-content="Deposit USDT to reward pool"
          >
            Deposit
            <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
        {!isAdmin && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-geist-mono">
            Only the admin can deposit to the reward pool.
          </p>
        )}
      </motion.div>

      {/* Withdraw All Funds */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-700/30"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4 font-geist">
          Withdraw All Funds
        </h3>
        <button
          onClick={() => {
            console.log("ManagePool.jsx: Withdraw All Funds button clicked");
            setIsWithdrawModalOpen(true);
          }}
          disabled={isActionLoading.withdraw || !isAdmin || !isPaused}
          className={`group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-red-600 border border-red-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base font-geist ${
            isActionLoading.withdraw || !isAdmin || !isPaused
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          data-tooltip-id="action-tooltip"
          data-tooltip-content="Withdraw all contract funds to an external wallet (emergency)"
        >
          Withdraw All
          <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </button>
        {!isAdmin && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-geist-mono">
            Only the admin can withdraw funds.
          </p>
        )}
        {isAdmin && !isPaused && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-geist-mono">
            Contract must be paused to withdraw funds.
          </p>
        )}
      </motion.div>

      {/* Withdraw Modal */}
      <ReactModal
        isOpen={isWithdrawModalOpen}
        onRequestClose={() => setIsWithdrawModalOpen(false)}
        className="bg-slate-900 p-4 sm:p-6 rounded-xl border border-cyan-700/30 max-w-md sm:max-w-lg w-full mx-4"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center"
        role="dialog"
        aria-labelledby="withdraw-modal-title"
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-4">
            <h3
              id="withdraw-modal-title"
              className="text-lg sm:text-xl font-bold text-slate-200 font-geist"
            >
              Emergency Withdraw
            </h3>
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-5 sm:w-6 h-5 sm:h-6" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mb-4 font-geist-mono">
            Withdraw the entire contract balance ({formatUSDT(contractBalance)}{" "}
            USDT) to an external wallet. Ensure the contract is paused first.
          </p>
          <input
            type="text"
            value={externalAddress}
            onChange={(e) => setExternalAddress(e.target.value)}
            placeholder="Enter external wallet address"
            className="w-full p-2 sm:p-3 bg-slate-800 text-slate-200 border border-cyan-700/30 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-600 font-geist-mono"
          />
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 sm:mt-6">
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-md hover:bg-slate-700 text-sm sm:text-base font-geist"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log("ManagePool.jsx: Confirm Withdraw button clicked");
                handleWithdrawAllFunds();
              }}
              disabled={isActionLoading.withdraw}
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm sm:text-base font-geist ${
                isActionLoading.withdraw ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Confirm Withdrawal
            </button>
          </div>
        </motion.div>
      </ReactModal>

      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 font-geist-mono text-xs"
      />
      <Tooltip
        id="action-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 font-geist-mono text-xs"
      />
      <Toaster position="top-right" />
    </div>
  );
}
