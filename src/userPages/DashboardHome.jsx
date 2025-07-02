import { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  DollarSign,
  Users,
  Shield,
  Gift,
  Copy,
  X,
} from "lucide-react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ReactModal from "react-modal";
import { Tooltip } from "react-tooltip";
import toast from "react-hot-toast";
import {
  useReadContract,
  useActiveWallet,
  useActiveAccount,
} from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { ethers } from "ethers";
import { USDTABI, StakingContractABI } from "../config/abis";

// Register Chart.js components
ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  ChartTooltip,
  Legend
);

// Environment variables
const USDT_DECIMALS = parseInt(import.meta.env.VITE_USDT_DECIMALS, 10) || 18;
const PLAN_REWARD_RATE =
  parseInt(import.meta.env.VITE_PLAN_REWARD_RATE, 10) || 20; // Default to 20%
const DAY_IN_SECONDS = 86400;
const PLAN_DURATION = 5 * DAY_IN_SECONDS; // 5 days in seconds
const REFERRAL_WITHDRAW_THRESHOLD = BigInt(
  import.meta.env.VITE_MIN_REFERRAL_WITHDRAWAL || 5 * 10 ** USDT_DECIMALS
); // 5 USDT in wei

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
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_PLAN_REWARD_RATE: PLAN_REWARD_RATE.toString(),
  VITE_MIN_REFERRAL_WITHDRAWAL: REFERRAL_WITHDRAW_THRESHOLD.toString(),
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "DashboardHome.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

// Validate PLAN_REWARD_RATE
if (PLAN_REWARD_RATE <= 0) {
  console.error(
    "DashboardHome.jsx: Invalid PLAN_REWARD_RATE:",
    PLAN_REWARD_RATE
  );
  throw new Error("PLAN_REWARD_RATE must be a positive number.");
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
  VITE_API_BASE_URL,
} = requiredEnvVars;

// Validate contract addresses
if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "DashboardHome.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "DashboardHome.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID and decimals
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("DashboardHome.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const decimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(decimals) || decimals < 0) {
  console.error(
    "DashboardHome.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: VITE_THIRDWEB_CLIENT_ID,
});

// Define chain
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
});

const stakingContract = getContract({
  client,
  chain: hardhatChain,
  address: VITE_STAKING_ADDRESS,
  abi: StakingContractABI,
});

// Check suspension status
const checkSuspensionStatus = async (userAddress) => {
  if (!ethers.isAddress(userAddress)) {
    console.error("DashboardHome.jsx: Invalid user address:", userAddress);
    return { isSuspended: false, reason: null };
  }

  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${VITE_API_BASE_URL}/api/check-suspension/${userAddress.toLowerCase()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("DashboardHome.jsx: Suspension check error", {
          status: response.status,
          errorText,
          attempt,
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("DashboardHome.jsx: Suspension status fetched", data);
      return data;
    } catch (err) {
      console.error("DashboardHome.jsx: Failed to check suspension status:", {
        message: err.message,
        attempt,
      });

      if (attempt === maxRetries) {
        console.warn(
          "DashboardHome.jsx: Max retries reached for suspension check"
        );
        return { isSuspended: false, reason: null };
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

// Utility to format USDT
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

// Utility to safely convert BigInt to Number
const safeBigIntToNumber = (value, fieldName) => {
  try {
    if (
      value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new Error(
        `Value ${value} for ${fieldName} exceeds safe Number range`
      );
    }
    return Number(value);
  } catch (err) {
    console.error(`safeBigIntToNumber error for ${fieldName}:`, err);
    throw err;
  }
};

// Utility to determine stake status
const getStakeStatus = (stake) => {
  if (stake.amountWei <= 0n) {
    return { label: "Unstaked", color: "bg-slate-600" };
  }
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const stakeEndTime = stake.startTimestamp + BigInt(PLAN_DURATION);
  if (currentTime < stakeEndTime) {
    return { label: "Locked", color: "bg-cyan-600" };
  }
  return { label: "Completed", color: "bg-green-600" };
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
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Retry wrapper for RPC calls
const withRetry = async (fn, retries = 3, delay = 200) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default function DashboardHome() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  console.log("DashboardHome.jsx: Active Account:", account);
  console.log("DashboardHome.jsx: Wallet Connector:", account?.connector);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [stakes, setStakes] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [totalPendingRewards, setTotalPendingRewards] = useState(0n);
  const [totalAccruedRewards, setTotalAccruedRewards] = useState(0n);
  const [isSuspended, setIsSuspended] = useState({
    isSuspended: false,
    reason: null,
  });

  // Contract data hooks
  const {
    data: stakeCountData,
    isLoading: isStakeCountLoading,
    error: stakeCountError,
    refetch: refetchStakeCount,
  } = useReadContract({
    contract: stakingContract,
    method: "getUserStakeCount",
    params: [account?.address],
    queryOptions: {
      enabled: !!account && ethers.isAddress(account?.address),
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 10000,
    },
  });

  const {
    data: referralBonusData,
    isLoading: isReferralBonusLoading,
    error: referralBonusError,
    refetch: refetchReferralBonus,
  } = useReadContract({
    contract: stakingContract,
    method: "getUserReferralBonus",
    params: [account?.address],
    queryOptions: {
      enabled: !!account && ethers.isAddress(account?.address),
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 10000,
    },
  });

  // Check suspension status on mount
  useEffect(() => {
    if (account?.address && ethers.isAddress(account.address)) {
      checkSuspensionStatus(account.address)
        .then((suspension) => {
          setIsSuspended(suspension);
        })
        .catch((err) => {
          console.error(
            "DashboardHome.jsx: Initial suspension check failed:",
            err
          );
          setIsSuspended({ isSuspended: false, reason: null });
        });
    }
  }, [account]);
  

  // Fetch stakes
  const fetchStakes = async (accountAddress, count) => {
    if (!accountAddress || !ethers.isAddress(accountAddress)) return [];
    if (!count || count <= 0) return [];
    if (count > Number.MAX_SAFE_INTEGER)
      throw new Error("Stake count too large");

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    const stakesData = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        for (let i = 0; i < count; i++) {
          const [stake, pendingReward, totalRewards] = await Promise.all([
            withRetry(() =>
              contract.stakes(accountAddress, i).catch((err) => {
                console.error(`fetchStakes: Error fetching stake ${i}:`, err);
                return {
                  amount: 0n,
                  startTimestamp: 0n,
                  lastRewardUpdate: 0n,
                  accruedReward: 0n,
                };
              })
            ),
            withRetry(() =>
              contract.calculateReward(accountAddress, i).catch((err) => {
                console.error(
                  `fetchStakes: Error fetching pending reward ${i}:`,
                  err
                );
                return 0n;
              })
            ),
            withRetry(() =>
              contract.getUserTotalRewards(accountAddress, i).catch((err) => {
                console.error(
                  `fetchStakes: Error fetching total rewards ${i}:`,
                  err
                );
                return 0n;
              })
            ),
          ]);

          const amountWei = BigInt(stake.amount || 0);
          const accruedReward = BigInt(stake.accruedReward || 0);
          const startTimestamp = BigInt(stake.startTimestamp || 0);
          const lastRewardUpdate = BigInt(stake.lastRewardUpdate || 0);
          const pendingRewardWei = BigInt(pendingReward || 0);
          const totalRewardsWei = BigInt(totalRewards || 0);

          stakesData.push({
            id: i,
            amount: formatUSDT(amountWei),
            amountWei,
            startTimestamp,
            lastRewardUpdate,
            accruedReward,
            pendingReward: pendingRewardWei,
            isActive:
              startTimestamp > 0n &&
              amountWei > 0n &&
              BigInt(Math.floor(Date.now() / 1000)) <
                startTimestamp + BigInt(PLAN_DURATION),
          });
        }
        return stakesData;
      } catch (err) {
        console.error(
          "fetchStakes error on attempt",
          attempt,
          ":",
          err.message
        );
        if (attempt === 3) {
          console.error(
            `DashboardHome.jsx: fetchStakes failed after 3 attempts at ${VITE_RPC_URL}:`,
            err
          );
          toast.error(`Failed to fetch stakes: ${err.message}`);
          return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  // Fetch referrals via ReferralRecorded events
  const fetchReferrals = async (accountAddress) => {
    console.log("DashboardHome.jsx: fetchReferrals called with:", {
      accountAddress,
    });
    if (!accountAddress || !ethers.isAddress(accountAddress)) {
      console.warn(
        "DashboardHome.jsx: Invalid account address, returning empty array"
      );
      return [];
    }

    const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );

    try {
      const filter = contract.filters.ReferralRecorded(accountAddress, null);
      const events = await withRetry(() =>
        contract.queryFilter(filter, 0, "latest")
      );
      const formattedReferrals = await Promise.all(
        events.map(async (event) => {
          const block = await provider.getBlock(event.blockNumber);
          return {
            address: event.args.referee.slice(0, 6) + "...",
            timestamp: new Date(block.timestamp * 1000)
              .toISOString()
              .split("T")[0],
          };
        })
      );
      console.log(
        "DashboardHome.jsx: fetchReferrals successful:",
        formattedReferrals
      );
      return formattedReferrals;
    } catch (err) {
      console.error("fetchReferrals error:", err.message);
      toast.error(`Failed to fetch referrals: ${err.message}`);
      return [];
    }
  };

  // Manage contract data and state
  useEffect(() => {
    console.log("DashboardHome.jsx: useEffect triggered", {
      account: !!account,
      address: account?.address,
      isValidAddress: ethers.isAddress(account?.address),
    });

    try {
      ReactModal.setAppElement("#root");
      if (
        !ChartJS ||
        !ReactModal ||
        !toast ||
        !motion ||
        !Line ||
        !Pie ||
        !Tooltip
      ) {
        throw new Error(
          "Required dependencies are missing. Please install all dependencies."
        );
      }

      if (stakeCountError) {
        console.error("DashboardHome.jsx: stakeCountError:", stakeCountError);
        toast.error(`Failed to fetch stake count: ${stakeCountError.message}`);
        setError(stakeCountError);
      }
      if (referralBonusError) {
        console.error(
          "DashboardHome.jsx: referralBonusError:",
          referralBonusError
        );
        toast.error(
          `Failed to fetch referral bonus: ${referralBonusError.message}`
        );
        setError(referralBonusError);
      }

      const updateData = async () => {
        if (
          account?.address &&
          ethers.isAddress(account.address) &&
          stakeCountData !== undefined &&
          !isStakeCountLoading
        ) {
          console.log("DashboardHome.jsx: Fetching stakes and referrals", {
            address: account.address,
            stakeCount: stakeCountData.toString(),
          });
          try {
            await refetchStakeCount();
            const countBigInt = BigInt(stakeCountData);
            if (countBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
              console.error(
                "updateData: Stake count exceeds safe integer limit:",
                countBigInt.toString()
              );
              throw new Error("Stake count too large for processing");
            }
            const stakesData = await fetchStakes(
              account.address,
              Number(countBigInt)
            );
            const referralsData = await fetchReferrals(account.address);
            const totalPendingRewards = stakesData.reduce(
              (sum, stake) => sum + stake.pendingReward,
              0n
            );
            const totalAccruedRewards = stakesData.reduce(
              (sum, stake) => sum + stake.accruedReward,
              0n
            );
            setStakes(stakesData);
            setReferrals(referralsData);
            setTotalPendingRewards(totalPendingRewards);
            setTotalAccruedRewards(totalAccruedRewards);
          } catch (err) {
            console.error("DashboardHome.jsx: Failed to fetch data:", err);
            toast.error(`Failed to fetch dashboard data at ${VITE_RPC_URL}`);
            setStakes([]);
            setReferrals([]);
            setTotalPendingRewards(0n);
            setTotalAccruedRewards(0n);
          }
        } else {
          console.log(
            "DashboardHome.jsx: Skipping data fetch - conditions not met",
            {
              address: account?.address,
              isValidAddress: ethers.isAddress(account?.address),
              stakeCountData,
              isReadable: stakeCountData !== undefined,
              isStakeCountLoading,
            }
          );
          setStakes([]);
          setReferrals([]);
          setTotalPendingRewards(0n);
          setTotalAccruedRewards(0n);
        }
      };

      setTimeout(() => {
        updateData();
        setIsLoading(false);
      }, 1000);

      const interval = setInterval(updateData, 10000);
      return () => {
        console.log("DashboardHome.jsx: Cleaning up interval");
        clearInterval(interval);
      };
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  }, [account, stakeCountData, isStakeCountLoading, refetchStakeCount]);

  // Copy referral link
  const handleCopyReferralLink = async () => {
    try {
      const link = `${window.location.origin}/dashboard/staking?ref=${
        account?.address || "0x0000000000000000000000000000000000000000"
      }`;
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!", { position: "top-right" });
    } catch (err) {
      console.error("DashboardHome.jsx: handleCopyReferralLink error:", err);
      toast.error("Failed to copy link", { position: "top-right" });
    }
  };

  // Line chart data (reward accrual)
  const lineChartData = useMemo(() => {
    const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
    const rewards = stakes
      .filter((stake) => stake.amountWei > 0n)
      .map((stake) => {
        const amountNumber = Number(
          ethers.formatUnits(stake.amountWei, USDT_DECIMALS)
        );
        if (isNaN(amountNumber)) {
          console.error(
            "lineChartData: Invalid amount for stake",
            stake.id,
            stake.amountWei.toString()
          );
          return labels.map(() => 0);
        }
        const dailyReward = (amountNumber * PLAN_REWARD_RATE) / (100 * 5);
        return labels.map((_, i) => Number((dailyReward * (i + 1)).toFixed(2)));
      });
    const totalRewards = rewards.reduce(
      (acc, curr) => acc.map((val, i) => val + curr[i]),
      [0, 0, 0, 0, 0]
    );
    return {
      labels,
      datasets: [
        {
          label: "Daily Rewards (USDT)",
          data: totalRewards,
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stakes]);

  // Pie chart data (stake distribution)
  const pieChartData = useMemo(() => {
    const validStakes = stakes.filter((stake) => stake.amountWei > 0n);
    return {
      labels: validStakes.map((stake) => `Stake ${stake.id + 1}`),
      datasets: [
        {
          data: validStakes.map((stake) =>
            Number(ethers.formatUnits(stake.amountWei, USDT_DECIMALS))
          ),
          backgroundColor: ["#22d3ee", "#06b6d4", "#0891b2"],
          borderColor: "#1e293b",
          borderWidth: 2,
        },
      ],
    };
  }, [stakes]);

  // Derived data
  const totalStaked = stakes.reduce((sum, stake) => sum + stake.amountWei, 0n);
  const activeStakes = stakes.filter(
    (stake) => stake.amountWei > 0n && stake.isActive
  ).length;
  const referralBonus = referralBonusData ? BigInt(referralBonusData) : 0n;

  // Progress bar percentage
  const referralProgress = Math.min(
    (Number(ethers.formatUnits(referralBonus, USDT_DECIMALS)) /
      Number(ethers.formatUnits(REFERRAL_WITHDRAW_THRESHOLD, USDT_DECIMALS))) *
      100,
    100
  );

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (isLoading || isStakeCountLoading || isReferralBonusLoading) {
    return (
      <div className="flex items-center justify-center bg-slate-900 p-4 w-full min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-4 border-cyan-600"></div>
    </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full bg-slate-900 max-w-full min-w-0">
      {isSuspended.isSuspended && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-red-500/20 text-red-200 p-3 rounded-md mb-4 font-geist-mono text-xs sm:text-sm"
        >
          Your account is suspended. Reason:{" "}
          {isSuspended.reason || "Not provided"}.
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold text-slate-200 mb-8 font-geist"
      >
        Dashboard Overview
      </motion.h2>

      {/* Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 sm:gap-4 mb-8 max-w-full">
        {[
          {
            icon: DollarSign,
            label: "Total Staked",
            value: `$${formatUSDT(totalStaked)}`,
            tooltip: "USDT staked in 5-day plan",
          },
          {
            icon: Gift,
            label: "Available Rewards",
            value: `$${formatUSDT(totalAccruedRewards + totalPendingRewards)}`,
            tooltip: "Rewards to claim or compound",
          },
          {
            icon: Shield,
            label: "Active Stakes",
            value: activeStakes,
            tooltip: "Funded stakes in lock period",
            modal: "stake",
          },
          {
            icon: Users,
            label: "Referral Bonus",
            value: `$${formatUSDT(referralBonus)}`,
            tooltip: "0.5 USDT per referral",
            modal: "referral",
          },
        ].map((item, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            initial="initial"
            animate={cardVariants.animate(index)}
            whileHover="hover"
            className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 flex flex-col space-y-3 w-full max-w-full min-w-0"
            data-tooltip-id="card-tooltip"
            data-tooltip-content={item.tooltip}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-slate-400 text-xs font-geist-mono truncate">
                  {item.label}
                </p>
                <p className="text-lg sm:text-xl font-bold text-white font-geist truncate">
                  {item.value}
                </p>
              </div>
            </div>
            {item.modal && (
              <button
                onClick={() =>
                  item.modal === "stake"
                    ? setStakeModalOpen(true)
                    : setReferralModalOpen(true)
                }
                className="text-cyan-600 text-xs font-geist hover:underline text-left"
              >
                View Details
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-8 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 max-w-full min-w-0"
        >
          <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-3 font-geist">
            Reward Accrual
          </h3>
          <div className="h-64 max-w-full">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Rewards (USDT)",
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 10 },
                    },
                    grid: { color: "#334155" },
                    ticks: {
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 8 },
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: "Days",
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 10 },
                    },
                    grid: { color: "#334155" },
                    ticks: {
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 8 },
                    },
                  },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: "#e2e8f0",
                      font: { family: "Geist Mono", size: 10 },
                    },
                  },
                  tooltip: {
                    backgroundColor: "#1e293b",
                    titleColor: "#22d3ee",
                    bodyColor: "#e2e8f0",
                    titleFont: { family: "Geist Mono", size: 10 },
                    bodyFont: { family: "Geist Mono", size: 8 },
                  },
                },
              }}
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 max-w-full min-w-0"
        >
          <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-3 font-geist">
            Stake Distribution
          </h3>
          <div className="h-64 flex items-center justify-center max-w-full">
            {pieChartData.labels.length > 0 ? (
              <Pie
                data={pieChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        color: "#e2e8f0",
                        font: { family: "Geist Mono", size: 10 },
                      },
                    },
                    tooltip: {
                      backgroundColor: "#1e293b",
                      titleColor: "#22d3ee",
                      bodyColor: "#e2e8f0",
                      titleFont: { family: "Geist Mono", size: 10 },
                      bodyFont: { family: "Geist Mono", size: 8 },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-slate-400 text-xs font-geist-mono">
                No active stakes to display.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Referral Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 mb-8 max-w-full min-w-0 overflow-hidden"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-3 font-geist">
          Referral Progress
        </h3>
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-3 max-w-full min-w-0 overflow-hidden">
          <p className="text-[10px] text-slate-400 font-geist-mono max-w-[calc(100%-80px)] text-ellipsis overflow-hidden whitespace-nowrap flex-1">
            {`${window.location.origin}/dashboard/staking?ref=${
              account?.address || "0x0"
            }`}
          </p>
          <button
            onClick={handleCopyReferralLink}
            className="group flex items-center justify-center px-3 py-1.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs"
            data-tooltip-id="copy-tooltip"
            data-tooltip-content="Copy your referral link"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Copy
          </button>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 mb-3 max-w-full">
          <motion.div
            className="bg-cyan-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${referralProgress}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-slate-400 text-xs font-geist-mono">
          {formatUSDT(referralBonus)} /{" "}
          {formatUSDT(REFERRAL_WITHDRAW_THRESHOLD)} USDT to withdraw
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex flex-col sm:flex-row justify-center gap-3 max-w-full"
      >
        <NavLink
          to="/dashboard/staking"
          className="group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm"
        >
          Stake Now
          <ArrowRight className="ml-1.5 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </NavLink>
        <NavLink
          to="/dashboard/referrals"
          className="group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm"
        >
          Invite Friends
          <ArrowRight className="ml-1.5 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </NavLink>
        <a
          href="https://t.me/stakerpro2"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-cyan-600 text-white border border-cyan-600 rounded-md hover:bg-cyan-500 shadow-md transition-all duration-300 text-xs sm:text-sm"
          data-tooltip-id="telegram-tooltip"
          data-tooltip-content="Join our Telegram group for admin support"
        >
          <svg
            className="w-6 h-6 mr-1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="12" fill="#0088CC" />
            <path
              d="M5.45 17.45a.5.5 0 0 0 .7.15l2.8-2.1 2.8 2.1a.5.5 0 0 0 .75-.1l3.15-11.3a.5.5 0 0 0-.65-.65l-11.3 3.15a.5.5 0 0 0-.1.75l2.1 2.8 2.1-2.8a.5.5 0 0 1 .7 0l-2.1 2.8z"
              fill="#FFFFFF"
            />
          </svg>
          Click to join our Telegram group
        </a>
      </motion.div>

      {/* Stake Details Modal */}
      <ReactModal
        isOpen={stakeModalOpen}
        onRequestClose={() => setStakeModalOpen(false)}
        className="bg-slate-900 p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
              Stake Details
            </h3>
            <button
              onClick={() => setStakeModalOpen(false)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
            </button>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-cyan-700/30">
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Stake ID
                  </th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Amount (USDT)
                  </th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Start Time
                  </th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Pending Rewards
                  </th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Accrued Rewards
                  </th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stakes.map((stake) => {
                  const { label, color } = getStakeStatus(stake);
                  return (
                    <tr key={stake.id} className="border-b border-cyan-700/30">
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        {stake.id}
                      </td>
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        {stake.amount}
                      </td>
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        {stake.startTimestamp === 0n
                          ? "-"
                          : new Date(
                              safeBigIntToNumber(
                                stake.startTimestamp,
                                "startTimestamp"
                              ) * 1000
                            ).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        {formatUSDT(stake.pendingReward)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        {formatUSDT(stake.accruedReward)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                        <span
                          className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm ${color} text-slate-200`}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-slate-200 font-geist-mono text-xs sm:text-sm">
            <p>
              Available Rewards:{" "}
              {formatUSDT(totalAccruedRewards + totalPendingRewards)} USDT
            </p>
            <p>
              Lifetime Rewards:{" "}
              {formatUSDT(totalAccruedRewards + totalPendingRewards)} USDT
              (Accrued: {formatUSDT(totalAccruedRewards)} USDT | Pending:{" "}
              {formatUSDT(totalPendingRewards)} USDT)
            </p>
            {stakes.some(
              (stake) => stake.amountWei <= 0n && stake.accruedReward > 0n
            ) && (
              <p>
                Note: Unstaked stakes may have claimable rewards. Early
                unstaking incurs a 50% reward penalty.
              </p>
            )}
          </div>
        </motion.div>
      </ReactModal>

      {/* Referral History Modal */}
      <ReactModal
        isOpen={referralModalOpen}
        onRequestClose={() => setReferralModalOpen(false)}
        className="bg-slate-900 p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md md:max-w-lg w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
              Referral History
            </h3>
            <button
              onClick={() => setReferralModalOpen(false)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
            </button>
          </div>
          <ul className="space-y-2 sm:space-y-3 text-slate-200 font-geist-mono text-xs sm:text-sm">
            {referrals.map((referral, index) => (
              <li key={index} className="flex justify-between">
                <span>{referral.address}</span>
                <span>{referral.timestamp}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            Total Referrals: {referrals.length} | Bonus:{" "}
            {formatUSDT(referralBonus)} USDT
          </p>
        </motion.div>
      </ReactModal>

      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
      <Tooltip
        id="copy-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
      <Tooltip
        id="telegram-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
    </div>
  );
}
