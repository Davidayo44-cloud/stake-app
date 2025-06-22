import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useReadContract,
  useActiveWallet,
  useActiveAccount,
} from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import {
  DollarSign,
  Shield,
  AlertTriangle,
  Users,
  X,
  RefreshCw,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import { Toaster, toast } from "react-hot-toast";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ReactModal from "react-modal";
import { ethers } from "ethers";
import { MockUSDTABI, USDTABI, StakingContractABI } from "../config/abis";

// Register Chart.js components
ChartJS.register(
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler,
  ChartTooltip,
  Legend
);

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_RELAYER_URL: import.meta.env.VITE_RELAYER_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
  VITE_STAKING_DEPLOYMENT_BLOCK: import.meta.env.VITE_STAKING_DEPLOYMENT_BLOCK,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "AdminHome.jsx: Missing environment variables:",
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
  VITE_RELAYER_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_DECIMALS,
  VITE_STAKING_DEPLOYMENT_BLOCK,
} = requiredEnvVars;

// Validate contract addresses
if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "AdminHome.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "AdminHome.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("AdminHome.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}

// Validate native currency decimals
const nativeCurrencyDecimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(nativeCurrencyDecimals) || nativeCurrencyDecimals < 0) {
  console.error(
    "AdminHome.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}

// Validate USDT decimals
const USDT_DECIMALS = parseInt(VITE_USDT_DECIMALS, 10) || 18;
if (isNaN(USDT_DECIMALS) || USDT_DECIMALS < 0) {
  console.error("AdminHome.jsx: Invalid USDT decimals:", VITE_USDT_DECIMALS);
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
    decimals: nativeCurrencyDecimals,
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

// Constants
const DEPOSIT_AMOUNT = BigInt(100 * 10 ** USDT_DECIMALS); // 100 USDT in wei
const DAY_IN_SECONDS = 86400;
const CACHE_TTL = 60 * 1000; // 1 minute for testing
const PLAN_REWARD_RATE = 0.13; // 13%

// Format USDT
const formatUSDT = (value) => {
  try {
    if (value === null || value === undefined || value < 0n) {
      console.warn("formatUSDT: Invalid value:", value);
      return "0.00";
    }
    return Number(ethers.formatUnits(value, USDT_DECIMALS)).toFixed(2);
  } catch (err) {
    console.error("formatUSDT error:", err, "Value:", value);
    return "0.00";
  }
};

// Format date (YYYY-MM-DD)
const formatDate = (timestamp) => {
  if (!timestamp) return new Date().toISOString().split("T")[0];
  return new Date(timestamp * 1000).toISOString().split("T")[0];
};

// Cache utilities
const getCachedData = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(key);
    return null;
  }
  if (key === "userStakes") {
    return data.map((stake) => ({
      ...stake,
      amount: BigInt(stake.amount),
    }));
  }
  if (key === "historicalStakes") {
    return data.map((entry) => ({
      ...entry,
      amount: BigInt(entry.amount),
    }));
  }
  if (key === "historicalPool") {
    return data.map((entry) => ({
      ...entry,
      balance: BigInt(entry.balance),
    }));
  }
  if (key === "totalStakesPerDay") {
    return data.map((entry) => ({
      ...entry,
      amount: BigInt(entry.amount),
    }));
  }
  return data;
};

const setCachedData = (key, data) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log(`AdminHome.jsx: Not caching empty data for ${key}`);
    return;
  }
  let serializedData = data;
  if (key === "userStakes") {
    serializedData = data.map((stake) => ({
      ...stake,
      amount: stake.amount.toString(),
    }));
  }
  if (key === "historicalStakes") {
    serializedData = data.map((entry) => ({
      ...entry,
      amount: entry.amount.toString(),
    }));
  }
  if (key === "historicalPool") {
    serializedData = data.map((entry) => ({
      ...entry,
      balance: entry.balance.toString(),
    }));
  }
  if (key === "totalStakesPerDay") {
    serializedData = data.map((entry) => ({
      ...entry,
      amount: entry.amount.toString(),
    }));
  }
  localStorage.setItem(
    key,
    JSON.stringify({ data: serializedData, timestamp: Date.now() })
  );
};

// Clear cache utility
const clearCache = () => {
  ["userStakes", "historicalStakes", "historicalPool", "totalStakesPerDay"].forEach((key) => {
    localStorage.removeItem(key);
    console.log(`AdminHome.jsx: Cleared cache for ${key}`);
  });
};

// Animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.1 },
  }),
  hover: { scale: 1.05, boxShadow: "0 0 20px rgba(14, 116, 144, 0.3)" },
};

const chartVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// Error boundary component
function ErrorFallback({ error }) {
  console.error("AdminHome.jsx: ErrorFallback:", {
    message: error.message,
    stack: error.stack,
  });
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 font-geist">
          Something went wrong
        </h2>
        <p className="text-sm sm:text-base">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 text-sm sm:text-base font-geist-mono"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function AdminHome() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [externalAddress, setExternalAddress] = useState("");
  const [adminData, setAdminData] = useState({
    rewardPoolBalance: BigInt(0),
    totalStaked: BigInt(0),
    contractBalance: BigInt(0),
    isPaused: false,
    adminAddress: "",
    userStakes: [],
    historicalPool: [],
    historicalStakes: [],
    totalStakesPerDay: [],
  });
  const [isActionLoading, setIsActionLoading] = useState({
    togglePause: false,
    deposit: false,
    withdraw: false,
    emergency: false,
    refresh: false,
  });

  // Utility function to truncate address
  const truncateAddress = (address) => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  console.log("AdminHome.jsx: Component rendered", {
    wallet: wallet ? Object.keys(wallet) : null,
    account: account ? { address: account.address } : null,
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
    data: totalStaked,
    isLoading: isTotalStakedLoading,
    error: totalStakedError,
    refetch: refetchTotalStaked,
  } = useReadContract({
    contract: stakingContract,
    method: "totalStaked",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  const {
    data: contractBalance,
    isLoading: isContractBalanceLoading,
    error: contractBalanceError,
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

  // Fetch user stakes
  const fetchUserStakes = async () => {
    console.log("AdminHome.jsx: fetchUserStakes called");
    const cacheKey = "userStakes";
    // Temporarily bypass cache to ensure fresh data
    // const cached = getCachedData(cacheKey);
    // if (cached) {
    //   console.log("AdminHome.jsx: fetchUserStakes: Returning cached data", cached);
    //   return cached;
    // }

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = parseInt(VITE_STAKING_DEPLOYMENT_BLOCK, 10);
      console.log("AdminHome.jsx: fetchUserStakes: Querying blocks", {
        fromBlock,
        toBlock: "latest",
      });
      const filter = contract.filters.Staked(null, null);
      const events = await contract.queryFilter(filter, fromBlock, "latest");
      console.log("AdminHome.jsx: fetchUserStakes: Fetched events", {
        eventCount: events.length,
        events: events.map((e) => ({
          user: e.args.user,
          amount: e.args.amount.toString(),
        })),
      });
      const blockPromises = events.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      const stakes = await Promise.all(
        events.map(async (event, index) => {
          const user = event.args.user;
          const amount = BigInt(event.args.amount);
          return {
            address: `${user.slice(0, 6)}...${user.slice(-4)}`,
            fullAddress: user,
            amount,
            timestamp: formatDate(blocks[index].timestamp),
          };
        })
      );
      const filteredStakes = stakes.slice(0, 10);
      console.log(
        "AdminHome.jsx: fetchUserStakes: Processed stakes",
        filteredStakes
      );
      setCachedData(cacheKey, filteredStakes);
      return filteredStakes;
    } catch (err) {
      console.error("AdminHome.jsx: fetchUserStakes error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Failed to fetch user stakes: ${err.message}`);
      return [];
    }
  };

  // Fetch historical stakes
  const fetchHistoricalStakes = async () => {
    console.log("AdminHome.jsx: fetchHistoricalStakes called");
    const cacheKey = "historicalStakes";
    // Temporarily bypass cache
    // const cached = getCachedData(cacheKey);
    // if (cached) {
    //   console.log(
    //     "AdminHome.jsx: fetchHistoricalStakes: Returning cached data",
    //     cached
    //   );
    //   return cached;
    // }

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = parseInt(VITE_STAKING_DEPLOYMENT_BLOCK, 10);
      console.log("AdminHome.jsx: fetchHistoricalStakes: Querying blocks", {
        fromBlock,
        toBlock: "latest",
      });
      const filter = contract.filters.Staked(null, null);
      const events = await contract.queryFilter(filter, fromBlock, "latest");
      console.log("AdminHome.jsx: fetchHistoricalStakes: Fetched events", {
        eventCount: events.length,
        events: events.map((e) => ({
          user: e.args.user,
          amount: e.args.amount.toString(),
        })),
      });
      const blockPromises = events.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      const stakesByDate = {};
      events.forEach((event, index) => {
        const date = formatDate(blocks[index].timestamp);
        const amount = BigInt(event.args.amount);
        stakesByDate[date] = BigInt(stakesByDate[date] || 0) + amount;
      });
      const historical = Object.entries(stakesByDate)
        .map(([date, amount]) => ({ date, amount: BigInt(amount) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log(
        "AdminHome.jsx: fetchHistoricalStakes: Processed historical stakes",
        historical
      );
      setCachedData(cacheKey, historical);
      return historical;
    } catch (err) {
      console.error("AdminHome.jsx: fetchHistoricalStakes error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Failed to fetch historical stakes: ${err.message}`);
      return [];
    }
  };

  // Fetch historical pool
  const fetchHistoricalPool = async () => {
    console.log("AdminHome.jsx: fetchHistoricalPool called");
    const cacheKey = "historicalPool";
    // Temporarily bypass cache
    // const cached = getCachedData(cacheKey);
    // if (cached) {
    //   console.log(
    //     "AdminHome.jsx: fetchHistoricalPool: Returning cached data",
    //     cached
    //   );
    //   return cached;
    // }

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = parseInt(VITE_STAKING_DEPLOYMENT_BLOCK, 10);
      console.log("AdminHome.jsx: fetchHistoricalPool: Querying blocks", {
        fromBlock,
        toBlock: "latest",
      });
      const depositFilter = contract.filters.RewardPoolDeposited(null, null);
      const withdrawalFilter = contract.filters.AdminWithdrawal(null, null);
      const [depositEvents, withdrawalEvents] = await Promise.all([
        contract.queryFilter(depositFilter, fromBlock, "latest"),
        contract.queryFilter(withdrawalFilter, fromBlock, "latest"),
      ]);
      console.log("AdminHome.jsx: fetchHistoricalPool: Fetched events", {
        depositEventCount: depositEvents.length,
        withdrawalEventCount: withdrawalEvents.length,
      });
      const allEvents = [...depositEvents, ...withdrawalEvents].sort(
        (a, b) => a.blockNumber - b.blockNumber
      );
      const blockPromises = allEvents.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      let currentBalance = BigInt(adminData.rewardPoolBalance);
      const history = [];
      allEvents.forEach((event, index) => {
        const date = formatDate(blocks[index].timestamp);
        const amount = BigInt(event.args.amount);
        if (event.event === "RewardPoolDeposited") {
          currentBalance = currentBalance - amount;
        } else {
          currentBalance = currentBalance + amount;
        }
        history.push({ date, balance: currentBalance });
      });
      const reducedHistory = history
        .reduce((acc, curr) => {
          const existing = acc.find((item) => item.date === curr.date);
          if (existing) {
            existing.balance = curr.balance;
          } else {
            acc.push(curr);
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      // Fallback: If no events, use current rewardPoolBalance
      if (reducedHistory.length === 0) {
        reducedHistory.push({
          date: formatDate(Date.now() / 1000),
          balance: adminData.rewardPoolBalance,
        });
      }
      console.log(
        "AdminHome.jsx: fetchHistoricalPool: Processed historical pool",
        reducedHistory
      );
      setCachedData(cacheKey, reducedHistory);
      return reducedHistory;
    } catch (err) {
      console.error("AdminHome.jsx: fetchHistoricalPool error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Failed to fetch historical pool data: ${err.message}`);
      return [
        {
          date: formatDate(Date.now() / 1000),
          balance: adminData.rewardPoolBalance,
        },
      ];
    }
  };

  // Fetch total stakes per day
  const fetchTotalStakesPerDay = async () => {
    console.log("AdminHome.jsx: fetchTotalStakesPerDay called");
    const cacheKey = "totalStakesPerDay";
    // Temporarily bypass cache
    // const cached = getCachedData(cacheKey);
    // if (cached) {
    //   console.log("AdminHome.jsx: fetchTotalStakesPerDay: Returning cached data", cached);
    //   return cached;
    // }

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = parseInt(VITE_STAKING_DEPLOYMENT_BLOCK, 10);
      console.log("AdminHome.jsx: fetchTotalStakesPerDay: Querying blocks", {
        fromBlock,
        toBlock: "latest",
      });
      const filter = contract.filters.Staked(null, null);
      const events = await contract.queryFilter(filter, fromBlock, "latest");
      console.log("AdminHome.jsx: fetchTotalStakesPerDay: Fetched events", {
        eventCount: events.length,
        events: events.map((e) => ({
          user: e.args.user,
          amount: e.args.amount.toString(),
        })),
      });

      const blockPromises = events.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      const stakesByDate = {};
      events.forEach((event, index) => {
        const date = formatDate(blocks[index].timestamp);
        const amount = BigInt(event.args.amount);
        stakesByDate[date] = BigInt(stakesByDate[date] || 0) + amount;
      });

      const totalStakes = Object.entries(stakesByDate)
        .map(([date, amount]) => ({ date, amount: BigInt(amount) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7);
      console.log(
        "AdminHome.jsx: fetchTotalStakesPerDay: Processed total stakes",
        totalStakes
      );
      setCachedData(cacheKey, totalStakes);
      return totalStakes;
    } catch (err) {
      console.error("AdminHome.jsx: fetchTotalStakesPerDay error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Failed to fetch total stakes per day: ${err.message}`);
      return [];
    }
  };

  // Data fetching
  // Data fetching function
  const updateData = async () => {
    console.log("AdminHome.jsx: updateData called");
    setFetchingData(true);
    try {
      const newData = { ...adminData };
      if (rewardPoolBalance !== undefined) {
        newData.rewardPoolBalance = BigInt(rewardPoolBalance);
      }
      if (totalStaked !== undefined) {
        newData.totalStaked = BigInt(totalStaked);
      }
      if (contractBalance !== undefined) {
        newData.contractBalance = BigInt(contractBalance);
      }
      if (isPaused !== undefined) {
        newData.isPaused = isPaused;
      }
      if (adminAddress) {
        newData.adminAddress = adminAddress;
      }
      const [userStakes, historicalStakes, historicalPool, totalStakesPerDay] =
        await Promise.all([
          fetchUserStakes(),
          fetchHistoricalStakes(),
          fetchHistoricalPool(),
          fetchTotalStakesPerDay(),
        ]);
      newData.userStakes = userStakes;
      newData.historicalStakes = historicalStakes;
      newData.historicalPool = historicalPool;
      newData.totalStakesPerDay = totalStakesPerDay;

      setAdminData(newData);
      setIsLoading(false);
      setFetchingData(false);
    } catch (err) {
      console.error("AdminHome.jsx: updateData error:", {
        message: err.message,
        stack: err.stack,
      });
      setError(err);
      setIsLoading(false);
      setFetchingData(false);
    }
  };

  // Data fetching effect
  useEffect(() => {
    console.log("AdminHome.jsx: useEffect for data fetching triggered");
    ReactModal.setAppElement("#root");
    let isMounted = true;

    updateData();
    const interval = setInterval(updateData, 30000);
    return () => {
      console.log("AdminHome.jsx: Cleaning up useEffect");
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    rewardPoolBalance,
    totalStaked,
    contractBalance,
    isPaused,
    adminAddress,
    isRewardPoolLoading,
    isTotalStakedLoading,
    isContractBalanceLoading,
    isPausedLoading,
    isAdminLoading,
  ]);

  // Handle refresh
  const handleRefresh = async () => {
    console.log("AdminHome.jsx: handleRefresh called");
    setIsActionLoading((prev) => ({ ...prev, refresh: true }));
    clearCache();
    try {
      await Promise.all([
        refetchRewardPool(),
        refetchTotalStaked(),
        refetchContractBalance(),
        refetchPaused(),
        refetchAdmin(),
      ]);
      await updateData();
      toast.success("Data refreshed successfully!");
    } catch (err) {
      console.error("AdminHome.jsx: handleRefresh error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Failed to refresh data: ${err.message}`);
    } finally {
      setIsActionLoading((prev) => ({ ...prev, refresh: false }));
    }
  };

  // Handle errors
  useEffect(() => {
    console.log("AdminHome.jsx: useEffect for error handling triggered");
    if (rewardPoolError) {
      console.error("AdminHome.jsx: rewardPoolError:", {
        message: rewardPoolError.message,
        stack: rewardPoolError.stack,
      });
      toast.error(`Failed to fetch reward pool: ${rewardPoolError.message}`);
      setError(rewardPoolError);
    }
    if (totalStakedError) {
      console.error("AdminHome.jsx: totalStakedError:", {
        message: totalStakedError.message,
        stack: totalStakedError.stack,
      });
      toast.error(`Failed to fetch total staked: ${totalStakedError.message}`);
      setError(totalStakedError);
    }
    if (contractBalanceError) {
      console.error("AdminHome.jsx: contractBalanceError:", {
        message: contractBalanceError.message,
        stack: contractBalanceError.stack,
      });
      toast.error(
        `Failed to fetch contract balance: ${contractBalanceError.message}`
      );
      setError(contractBalanceError);
    }
    if (pausedError) {
      console.error("AdminHome.jsx: pausedError:", {
        message: pausedError.message,
        stack: pausedError.stack,
      });
      toast.error(`Failed to fetch pause status: ${pausedError.message}`);
      setError(pausedError);
    }
    if (adminError) {
      console.error("AdminHome.jsx: adminError:", {
        message: adminError.message,
        stack: adminError.stack,
      });
      toast.error(`Failed to fetch admin address: ${adminError.message}`);
      setError(adminError);
    }
  }, [
    rewardPoolError,
    totalStakedError,
    contractBalanceError,
    pausedError,
    adminError,
  ]);

  // Admin access check
  // if (
  //   account?.address &&
  //   adminAddress &&
  //   account.address.toLowerCase() !== adminAddress.toLowerCase()
  // ) {
  //   console.log("AdminHome.jsx: Access denied", {
  //     connectedAddress: account.address,
  //     adminAddress,
  //   });
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200">
  //       <div className="text-center">
  //         <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 font-geist">
  //           Access Denied
  //         </h2>
  //         <p className="text-sm sm:text-base">
  //           Only the admin address ({adminAddress}) can access this dashboard.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  // Admin actions
  const togglePause = async () => {
    console.log("AdminHome.jsx: togglePause called", {
      account: account ? { address: account.address } : null,
      isPaused: adminData.isPaused,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("AdminHome.jsx: togglePause: Invalid account", { account });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (
      account.address.toLowerCase() !== adminData.adminAddress.toLowerCase()
    ) {
      console.error("AdminHome.jsx: togglePause: Not admin account", {
        accountAddress: account.address,
        adminAddress: adminData.adminAddress,
      });
      toast.error("Only the admin can toggle pause");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, togglePause: true }));
    const toastId = toast.loading(
      adminData.isPaused ? "Unpausing contract..." : "Pausing contract..."
    );
    try {
      const method = adminData.isPaused ? "unpause" : "pause";
      const contractInterface = new ethers.Interface(StakingContractABI);
      const encodedData = contractInterface.encodeFunctionData(method, []);

      if (!encodedData || encodedData === "0x") {
        console.error("AdminHome.jsx: togglePause: Invalid encoded data");
        throw new Error(
          "Failed to encode transaction. Verify StakingContract ABI."
        );
      }

      const transaction = {
        to: stakingContract.address,
        data: encodedData,
        value: "0",
      };
      console.log(
        "AdminHome.jsx: togglePause: Sending transaction",
        transaction
      );
      await account.sendTransaction(transaction);
      console.log("AdminHome.jsx: togglePause: Transaction sent successfully");

      toast.success(
        adminData.isPaused ? "Contract unpaused!" : "Contract paused!",
        { id: toastId }
      );
      await refetchPaused();
    } catch (err) {
      console.error("AdminHome.jsx: togglePause error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, togglePause: false }));
      console.log("AdminHome.jsx: togglePause completed");
    }
  };

  const depositRewardPool = async () => {
    console.log("AdminHome.jsx: depositRewardPool called", {
      account: account ? { address: account.address } : null,
      amount: DEPOSIT_AMOUNT,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("AdminHome.jsx: depositRewardPool: Invalid account", {
        account,
      });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (
      account.address.toLowerCase() !== adminData.adminAddress.toLowerCase()
    ) {
      console.error("AdminHome.jsx: depositRewardPool: Not admin account", {
        accountAddress: account.address,
        adminAddress: adminData.adminAddress,
      });
      toast.error("Only the admin can deposit to reward pool");
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
      const usdt = new ethers.Contract(VITE_USDT_ADDRESS, USDTABI, provider);
      const balance = await usdt.balanceOf(account.address);
      if (balance < DEPOSIT_AMOUNT) {
        console.error(
          "AdminHome.jsx: depositRewardPool: Insufficient USDT balance",
          { balance, required: DEPOSIT_AMOUNT }
        );
        toast.error("Insufficient USDT balance. Please add funds.");
        return;
      }
    } catch (err) {
      console.error(
        "AdminHome.jsx: depositRewardPool: Failed to check USDT balance",
        { message: err.message, stack: err.stack }
      );
      toast.error("Failed to verify USDT balance. Please try again.");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, deposit: true }));
    const toastId = toast.loading(
      `Depositing ${formatUSDT(DEPOSIT_AMOUNT)} USDT...`
    );
    try {
      const usdtInterface = new ethers.Interface(USDTABI);
      const stakingInterface = new ethers.Interface(StakingContractABI);

      const approveData = usdtInterface.encodeFunctionData("approve", [
        VITE_STAKING_ADDRESS,
        DEPOSIT_AMOUNT,
      ]);
      if (!approveData || approveData === "0x") {
        console.error(
          "AdminHome.jsx: depositRewardPool: Invalid approve encoded data"
        );
        throw new Error(
          "Failed to encode approve transaction. Verify MockUSDT ABI."
        );
      }

      const approveTx = {
        to: VITE_USDT_ADDRESS,
        data: approveData,
        value: "0",
      };
      console.log(
        "AdminHome.jsx: depositRewardPool: Sending approve transaction",
        approveTx
      );
      await account.sendTransaction(approveTx);
      console.log(
        "AdminHome.jsx: depositRewardPool: Approve transaction sent successfully"
      );

      const depositData = stakingInterface.encodeFunctionData(
        "depositRewardPool",
        [DEPOSIT_AMOUNT]
      );
      if (!depositData || depositData === "0x") {
        console.error(
          "AdminHome.jsx: depositRewardPool: Invalid deposit encoded data"
        );
        throw new Error(
          "Failed to encode deposit transaction. Verify StakingContract ABI."
        );
      }

      const depositTx = {
        to: VITE_STAKING_ADDRESS,
        data: depositData,
        value: "0",
      };
      console.log(
        "AdminHome.jsx: depositRewardPool: Sending deposit transaction",
        depositTx
      );
      await account.sendTransaction(depositTx);
      console.log(
        "AdminHome.jsx: depositRewardPool: Deposit transaction sent successfully"
      );

      toast.success(
        `Deposited ${formatUSDT(DEPOSIT_AMOUNT)} USDT to reward pool!`,
        { id: toastId }
      );
      await Promise.all([refetchRewardPool(), refetchContractBalance()]);
    } catch (err) {
      console.error("AdminHome.jsx: depositRewardPool error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, deposit: false }));
      console.log("AdminHome.jsx: depositRewardPool completed");
    }
  };

  const withdrawExcessFunds = async () => {
    console.log("AdminHome.jsx: withdrawExcessFunds called", {
      account: account ? { address: account.address } : null,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("AdminHome.jsx: withdrawExcessFunds: Invalid account", {
        account,
      });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (
      account.address.toLowerCase() !== adminData.adminAddress.toLowerCase()
    ) {
      console.error("AdminHome.jsx: withdrawExcessFunds: Not admin account", {
        accountAddress: account.address,
        adminAddress: adminData.adminAddress,
      });
      toast.error("Only the admin can withdraw excess funds");
      return;
    }

    const excess =
      adminData.contractBalance >
      adminData.totalStaked + adminData.rewardPoolBalance
        ? adminData.contractBalance -
          (adminData.totalStaked + adminData.rewardPoolBalance)
        : BigInt(0);
    if (excess <= BigInt(0)) {
      console.log(
        "AdminHome.jsx: withdrawExcessFunds: No excess funds available",
        {
          contractBalance: adminData.contractBalance,
          totalStaked: adminData.totalStaked,
          rewardPoolBalance: adminData.rewardPoolBalance,
        }
      );
      toast.error("No excess funds available!");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, withdraw: true }));
    const toastId = toast.loading(`Withdrawing ${formatUSDT(excess)} USDT...`);
    try {
      const contractInterface = new ethers.Interface(StakingContractABI);
      const encodedData = contractInterface.encodeFunctionData(
        "withdrawExcessFunds",
        []
      );

      if (!encodedData || encodedData === "0x") {
        console.error(
          "AdminHome.jsx: withdrawExcessFunds: Invalid encoded data"
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
        "AdminHome.jsx: withdrawExcessFunds: Sending transaction",
        transaction
      );
      await account.sendTransaction(transaction);
      console.log(
        "AdminHome.jsx: withdrawExcessFunds: Transaction sent successfully"
      );

      toast.success(`Withdrew ${formatUSDT(excess)} USDT!`, { id: toastId });
      await refetchContractBalance();
    } catch (err) {
      console.error("AdminHome.jsx: withdrawExcessFunds error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, withdraw: false }));
      console.log("AdminHome.jsx: withdrawExcessFunds completed");
    }
  };

  const emergencyWithdraw = async () => {
    console.log("AdminHome.jsx: emergencyWithdraw called", {
      account: account ? { address: account.address } : null,
      externalAddress,
      amount: adminData.contractBalance,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("AdminHome.jsx: emergencyWithdraw: Invalid account", {
        account,
      });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (
      account.address.toLowerCase() !== adminData.adminAddress.toLowerCase()
    ) {
      console.error("AdminHome.jsx: emergencyWithdraw: Not admin account", {
        accountAddress: account.address,
        adminAddress: adminData.adminAddress,
      });
      toast.error("Only the admin can perform emergency withdrawal");
      return;
    }

    if (!ethers.isAddress(externalAddress)) {
      console.error(
        "AdminHome.jsx: emergencyWithdraw: Invalid external address",
        { externalAddress }
      );
      toast.error("Please enter a valid wallet address");
      return;
    }

    if (!adminData.isPaused) {
      console.error("AdminHome.jsx: emergencyWithdraw: Contract not paused", {
        isPaused: adminData.isPaused,
      });
      toast.error("Contract must be paused to withdraw funds");
      return;
    }

    if (adminData.contractBalance <= BigInt(0)) {
      console.error("AdminHome.jsx: emergencyWithdraw: No funds available", {
        contractBalance: adminData.contractBalance,
      });
      toast.error("No funds available to withdraw");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, emergency: true }));
    const toastId = toast.loading(
      `Withdrawing ${formatUSDT(adminData.contractBalance)} USDT...`
    );
    try {
      const contractInterface = new ethers.Interface(StakingContractABI);
      const encodedData = contractInterface.encodeFunctionData(
        "withdrawAllFundsTo",
        [externalAddress, adminData.contractBalance]
      );

      if (!encodedData || encodedData === "0x") {
        console.error("AdminHome.jsx: emergencyWithdraw: Invalid encoded data");
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
        "AdminHome.jsx: emergencyWithdraw: Sending transaction",
        transaction
      );
      await account.sendTransaction(transaction);
      console.log(
        "AdminHome.jsx: emergencyWithdraw: Transaction sent successfully"
      );

      toast.success(
        `Withdrew ${formatUSDT(
          adminData.contractBalance
        )} USDT to ${externalAddress.slice(0, 6)}...${externalAddress.slice(
          -4
        )}!`,
        { id: toastId }
      );
      await refetchContractBalance();
      setExternalAddress("");
      setEmergencyModalOpen(false);
    } catch (err) {
      console.error("AdminHome.jsx: emergencyWithdraw error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, emergency: false }));
      console.log("AdminHome.jsx: emergencyWithdraw completed");
    }
  };

  // Chart data
  const poolChartData = useMemo(
    () => ({
      labels:
        adminData.historicalPool.length > 0
          ? adminData.historicalPool.map((entry) => entry.date)
          : [formatDate(Date.now() / 1000)],
      datasets: [
        {
          label: "Reward Pool (USDT)",
          data:
            adminData.historicalPool.length > 0
              ? adminData.historicalPool.map((entry) =>
                  Number(ethers.formatUnits(entry.balance, USDT_DECIMALS))
                )
              : [
                  Number(
                    ethers.formatUnits(
                      adminData.rewardPoolBalance,
                      USDT_DECIMALS
                    )
                  ),
                ],
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
    }),
    [adminData.historicalPool, adminData.rewardPoolBalance]
  );

  const stakeChartData = useMemo(
    () => ({
      labels:
        adminData.userStakes.length > 0
          ? adminData.userStakes.map((stake) => stake.address)
          : ["No Stakes"],
      datasets: [
        {
          data:
            adminData.userStakes.length > 0
              ? adminData.userStakes.map((stake) =>
                  Number(ethers.formatUnits(stake.amount, USDT_DECIMALS))
                )
              : [1],
          backgroundColor:
            adminData.userStakes.length > 0
              ? ["#22d3ee", "#06b6d4", "#14b8a6", "#0d9488"]
              : ["#334155"],
          borderColor: "#1e293b",
          borderWidth: 2,
          hoverOffset: 20,
        },
      ],
    }),
    [adminData.userStakes]
  );

  const activityChartData = useMemo(
    () => ({
      labels:
        adminData.historicalStakes.length > 0
          ? adminData.historicalStakes.map((entry) => entry.date)
          : ["No Data"],
      datasets: [
        {
          label: "Total Staked (USDT)",
          data:
            adminData.historicalStakes.length > 0
              ? adminData.historicalStakes.map((entry) =>
                  Number(ethers.formatUnits(entry.amount, USDT_DECIMALS))
                )
              : [0],
          backgroundColor: "rgba(20, 184, 166, 0.6)",
          borderColor: "#14b8a6",
          borderWidth: 1,
          hoverBackgroundColor: "#14b8a6",
        },
      ],
    }),
    [adminData.historicalStakes]
  );

  // Pool utilization
  const poolUtilization =
    adminData.rewardPoolBalance > BigInt(0)
      ? Math.min(
          (Number(
            ethers.formatUnits(adminData.rewardPoolBalance, USDT_DECIMALS)
          ) /
            (Number(ethers.formatUnits(adminData.totalStaked, USDT_DECIMALS)) *
              PLAN_REWARD_RATE)) *
            100,
          100
        )
      : 0;

  // Current day's stakes
  const today = formatDate(Date.now() / 1000);
  const todayStakes =
    adminData.totalStakesPerDay.find((entry) => entry.date === today)?.amount ||
    BigInt(0);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (
    isLoading ||
    fetchingData ||
    isRewardPoolLoading ||
    isTotalStakedLoading ||
    isContractBalanceLoading ||
    isPausedLoading ||
    isAdminLoading
  ) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div
          className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 sm:border-t-6 border-cyan-600"
          aria-label="Loading"
        ></div>
      </div>
    );
  }

  console.log("AdminHome.jsx: Rendering UI", {
    adminAddress: adminData.adminAddress,
    isPaused: adminData.isPaused,
    rewardPoolBalance: adminData.rewardPoolBalance,
    totalStaked: adminData.totalStaked,
    contractBalance: adminData.contractBalance,
    userStakesCount: adminData.userStakes.length,
    totalStakesPerDayCount: adminData.totalStakesPerDay.length,
  });

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-slate-900 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6 sm:mb-8 lg:mb-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 font-geist"
        >
          Admin Overview
        </motion.h2>
        <motion.button
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(0)}
          whileHover="hover"
          onClick={handleRefresh}
          disabled={isActionLoading.refresh}
          className={`p-2 sm:p-3 rounded-lg text-sm sm:text-base font-geist-mono flex items-center space-x-2 ${
            isActionLoading.refresh
              ? "bg-slate-800/40 text-slate-400 cursor-not-allowed"
              : "bg-slate-800/40 text-cyan-600 hover:bg-slate-700/40"
          }`}
          data-tooltip-id="action-tooltip"
          data-tooltip-content="Refresh all data and clear cache"
          aria-label="Refresh data"
        >
          {isActionLoading.refresh ? (
            <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-t-2 border-cyan-600"></div>
          ) : (
            <>
              <RefreshCw className="w-5 sm:w-6 h-5 sm:h-6" />
              <span>Refresh</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Admin Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
          Admin Details
        </h3>
        <p
          className="text-xs sm:text-sm text-slate-400 font-geist-mono truncate"
          title={account?.address || "Not connected"}
        >
          Connected Address: {truncateAddress(account?.address)}
        </p>
        <p
          className="text-xs sm:text-sm text-slate-400 font-geist-mono truncate"
          title={adminData.adminAddress}
        >
          Admin Address: {truncateAddress(adminData.adminAddress)}
        </p>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
        {[
          {
            icon: DollarSign,
            label: "Reward Pool Balance",
            value: `$${formatUSDT(adminData.rewardPoolBalance)}`,
            tooltip: "USDT available for rewards",
          },
          {
            icon: Shield,
            label: "Total Staked",
            value: `$${formatUSDT(adminData.totalStaked)}`,
            tooltip: "Total USDT staked by users",
          },
          {
            icon: AlertTriangle,
            label: "Contract Status",
            value: adminData.isPaused ? "Paused" : "Active",
            tooltip: "Current state of the contract",
          },
          {
            icon: Users,
            label: "Today's Total Stakes",
            value: `$${formatUSDT(todayStakes)}`,
            tooltip: "Total USDT staked by all users today",
          },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            variants={cardVariants}
            initial="initial"
            animate={cardVariants.animate(index)}
            whileHover="hover"
            className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 flex flex-col space-y-4"
            data-tooltip-id="card-tooltip"
            data-tooltip-content={item.tooltip}
            role="region"
            aria-label={item.label}
          >
            <div className="flex items-center space-x-4">
              <item.icon className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600" />
              <div>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
                  {item.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white font-geist">
                  {item.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contract Balance */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(4)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
        data-tooltip-id="card-tooltip"
        data-tooltip-content="Total USDT in contract, including staked, rewards, and excess funds"
        role="region"
        aria-label="Contract Balance"
      >
        <div className="flex items-center space-x-4">
          <DollarSign className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600" />
          <div>
            <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
              Contract Balance
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-geist">
              ${formatUSDT(adminData.contractBalance)}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono mt-2">
              Excess Funds: $
              {formatUSDT(
                adminData.contractBalance >
                  adminData.totalStaked + adminData.rewardPoolBalance
                  ? adminData.contractBalance -
                      (adminData.totalStaked + adminData.rewardPoolBalance)
                  : BigInt(0)
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Total Stakes Per Day */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(5)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
        role="region"
        aria-label="Total Stakes Per Day"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
          Total Stakes Per Day
        </h3>
        {adminData.totalStakesPerDay.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
            No staking data available.
          </p>
        ) : (
          <ul className="space-y-2">
            {adminData.totalStakesPerDay.map((entry, index) => (
              <li
                key={entry.date}
                className="text-xs sm:text-sm text-slate-200 font-geist-mono"
              >
                {entry.date}: ${formatUSDT(entry.amount)} USDT
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
        <motion.div
          variants={chartVariants}
          initial="initial"
          animate="animate"
          className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 overflow-visible"
        >
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
            Reward Pool Trend
          </h3>
          <div
            className="min-h-40 sm:min-h-48 lg:min-h-64 w-full"
            aria-label="Reward Pool Trend Chart"
          >
            <Line
              data={poolChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Balance (USDT)",
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 12 },
                    },
                    grid: { color: "#334155" },
                    ticks: {
                      color: "#e2e8f0",
                      font: { size: 10 },
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: "Date",
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 12 },
                    },
                    grid: { color: "#334155" },
                    ticks: {
                      color: "#e2e8f0",
                      font: { size: 10 },
                    },
                  },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 12 },
                    },
                  },
                  tooltip: {
                    backgroundColor: "#1e293b",
                    titleColor: "#22d3ee",
                    bodyColor: "#e2e8f0",
                    titleFont: { family: "Geist Mono", size: 10 },
                    bodyFont: { family: "Geist Mono", size: 10 },
                    callbacks: {
                      label: (context) =>
                        `${context.dataset.label}: $${context.parsed.y.toFixed(
                          2
                        )} USDT`,
                    },
                  },
                },
              }}
            />
          </div>
        </motion.div>
        <motion.div
          variants={chartVariants}
          initial="initial"
          animate="animate"
          className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 overflow-visible"
        >
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
            Stake Distribution
          </h3>
          <div
            className="min-h-40 sm:min-h-48 lg:min-h-64 w-full flex items-center justify-center"
            aria-label="Stake Distribution Chart"
          >
            {stakeChartData.labels[0] === "No Stakes" ? (
              <p
                className="text-xs sm:text-sm text-slate-400 font-geist-mono"
                aria-hidden={stakeChartData.labels[0] !== "No Stakes"}
              >
                No stakes recorded.
              </p>
            ) : (
              <Doughnut
                data={stakeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        color: "#e2e8f0",
                        font: { family: "Geist Mono", size: 12 },
                      },
                    },
                    tooltip: {
                      backgroundColor: "#1e293b",
                      titleColor: "#22d3ee",
                      bodyColor: "#e2e8f0",
                      titleFont: { family: "Geist Mono", size: 10 },
                      bodyFont: { family: "Geist Mono", size: 10 },
                      callbacks: {
                        label: (context) =>
                          `${context.label}: $${context.parsed.toFixed(
                            2
                          )} USDT`,
                      },
                    },
                  },
                  onClick: () => {
                    console.log(
                      `AdminHome: Stake modal toggled - isOpen=${!stakeModalOpen}`
                    );
                    setStakeModalOpen(true);
                  },
                }}
              />
            )}
          </div>
        </motion.div>
        <motion.div
          variants={chartVariants}
          initial="initial"
          animate="animate"
          className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 overflow-visible"
        >
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
            Staking Activity
          </h3>
          <div
            className="min-h-40 sm:min-h-48 lg:min-h-64 w-full"
            aria-label="Staking Activity Chart"
          >
            {activityChartData.labels[0] === "No Data" ? (
              <p
                className="text-xs sm:text-sm text-slate-400 font-geist-mono"
                aria-hidden={activityChartData.labels[0] !== "No Data"}
              >
                No historical staking activity available.
              </p>
            ) : (
              <Bar
                data={activityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "Staked (USDT)",
                        color: "#e2e8f0",
                        font: { family: "Geist Mono", size: 12 },
                      },
                      grid: { color: "#334155" },
                      ticks: {
                        color: "#e2e8f0",
                        font: { size: 10 },
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: "Date",
                        color: "#e2e8f0",
                        font: { family: "Geist Mono", size: 12 },
                      },
                      grid: { color: "#334155" },
                      ticks: {
                        color: "#e2e8f0",
                        font: { size: 10 },
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: "#e2e8f0",
                        font: { family: "Geist Mono", size: 12 },
                      },
                    },
                    tooltip: {
                      backgroundColor: "#1e293b",
                      titleColor: "#22d3ee",
                      bodyColor: "#e2e8f0",
                      titleFont: { family: "Geist Mono", size: 10 },
                      bodyFont: { family: "Geist Mono", size: 10 },
                      callbacks: {
                        label: (context) =>
                          `${
                            context.dataset.label
                          }: $${context.parsed.y.toFixed(2)} USDT`,
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Pool Utilization */}
      <motion.div
        variants={chartVariants}
        initial="initial"
        animate="animate"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
        role="region"
        aria-label="Reward Pool Coverage"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
          Reward Pool Coverage
        </h3>
        <div className="w-full bg-slate-800 rounded-full h-3 sm:h-4 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-cyan-600 to-teal-600 h-3 sm:h-4 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${poolUtilization}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs sm:text-sm text-slate-400 font-geist-mono mt-2">
          Total Staked: ${formatUSDT(adminData.totalStaked)} USDT | Reward Pool:
          ${formatUSDT(adminData.rewardPoolBalance)} USDT
        </p>
      </motion.div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
        {[
          {
            label: adminData.isPaused ? "Unpause Contract" : "Pause Contract",
            action: togglePause,
            loading: isActionLoading.togglePause,
            disabled: isActionLoading.togglePause,
            tooltip: adminData.isPaused
              ? "Resume contract operations"
              : "Halt contract operations",
          },
          {
            label: "Deposit Reward Pool",
            action: depositRewardPool,
            loading: isActionLoading.deposit,
            disabled: isActionLoading.deposit || adminData.isPaused,
            tooltip: "Add funds to reward pool",
          },
          {
            label: "Withdraw Excess",
            action: withdrawExcessFunds,
            loading: isActionLoading.withdraw,
            disabled: isActionLoading.withdraw || adminData.isPaused,
            tooltip: "Withdraw funds exceeding stakes and rewards",
          },
          {
            label: "Emergency Withdraw",
            action: () => {
              console.log(
                `AdminHome: Emergency modal toggled - isOpen=${!emergencyModalOpen}`
              );
              setEmergencyModalOpen(true);
            },
            loading: isActionLoading.emergency,
            disabled: isActionLoading.emergency || !adminData.isPaused,
            tooltip:
              "Withdraw all funds to an external address (paused state only)",
          },
        ].map((item, index) => (
          <motion.button
            key={item.label}
            variants={cardVariants}
            initial="initial"
            animate={cardVariants.animate(index)}
            whileHover="hover"
            onClick={item.action}
            disabled={item.disabled}
            className={`p-4 sm:p-6 rounded-xl border border-cyan-700/30 flex items-center justify-center text-sm sm:text-base font-geist-mono transition-colors ${
              item.disabled
                ? "bg-slate-800/40 text-slate-400 cursor-not-allowed"
                : "bg-slate-800/40 text-cyan-600 hover:bg-slate-700/40"
            }`}
            data-tooltip-id="action-tooltip"
            data-tooltip-content={item.tooltip}
            aria-label={item.label}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                item.action();
              }
            }}
          >
            {item.loading ? (
              <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-t-2 border-cyan-600 mx-auto"></div>
            ) : (
              item.label
            )}
          </motion.button>
        ))}
      </div>

      {/* Stake Modal */}
      <ReactModal
        isOpen={stakeModalOpen}
        onRequestClose={() => setStakeModalOpen(false)}
        className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-xl mx-auto my-8 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        aria-labelledby="stake-modal-title"
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3
              id="stake-modal-title"
              className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 font-geist"
            >
              Stake Details
            </h3>
            <button
              onClick={() => setStakeModalOpen(false)}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {adminData.userStakes.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
              No stakes recorded.
            </p>
          ) : (
            <ul className="space-y-4">
              {adminData.userStakes.map((stake, index) => (
                <li
                  key={index}
                  className="bg-slate-700/40 p-4 rounded-lg text-xs sm:text-sm text-slate-200 font-geist-mono"
                >
                  <p>Address: {stake.fullAddress}</p>
                  <p>Amount: ${formatUSDT(stake.amount)} USDT</p>
                  <p>Date: {stake.timestamp}</p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </ReactModal>

      {/* Emergency Withdraw Modal */}
      <ReactModal
        isOpen={emergencyModalOpen}
        onRequestClose={() => setEmergencyModalOpen(false)}
        className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-xl mx-auto my-8 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        aria-labelledby="emergency-modal-title"
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3
              id="emergency-modal-title"
              className="text-lg sm:text-xl lg:text-2xl font-bold text W-200 font-geist"
            >
              Emergency Withdrawal
            </h3>
            <button
              onClick={() => setEmergencyModalOpen(false)}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-geist-mono mb-4">
            Withdraw all funds ({formatUSDT(adminData.contractBalance)} USDT) to
            an external address. Ensure the contract is paused.
          </p>
          <input
            type="text"
            value={externalAddress}
            onChange={(e) => setExternalAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="w-full p-3 bg-slate-700/40 text-slate-200 rounded-lg border border-cyan-700/30 focus:outline-none focus:border-cyan-600 text-xs sm:text-sm font-geist-mono mb-4"
            aria-label="External wallet address"
          />
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setEmergencyModalOpen(false)}
              className="px-4 py-2 bg-slate-700/40 text-slate-200 rounded-lg hover:bg-slate-600/40 text-xs sm:text-sm font-geist-mono"
              aria-label="Cancel emergency withdrawal"
            >
              Cancel
            </button>
            <button
              onClick={emergencyWithdraw}
              disabled={isActionLoading.emergency}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-geist-mono ${
                isActionLoading.emergency
                  ? "bg-slate-800/40 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-600 text-slate-900 hover:bg-cyan-500"
              }`}
              aria-label="Confirm emergency withdrawal"
            >
              {isActionLoading.emergency ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-slate-200 mx-auto"></div>
              ) : (
                "Withdraw"
              )}
            </button>
          </div>
        </motion.div>
      </ReactModal>

      {/* Tooltips */}
      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-slate-800/90 text-slate-200 text-xs sm:text-sm font-geist-mono rounded-lg p-2"
      />
      <Tooltip
        id="action-tooltip"
        place="top"
        className="bg-slate-800/90 text-slate-200 text-xs sm:text-sm font-geist-mono rounded-lg p-2"
      />

  
    </div>
  );
}