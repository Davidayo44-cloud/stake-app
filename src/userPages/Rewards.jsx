import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, X, ArrowRight, RefreshCw } from "lucide-react";
import ReactModal from "react-modal";
import { Tooltip } from "react-tooltip";
import toast from "react-hot-toast";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { useActiveWallet, useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { MockUSDTABI, StakingContractABI } from "../config/abis";

// Register Chart.js components
ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ChartTooltip,
  Legend
);

// Environment variables
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS;
const STAKING_ADDRESS = import.meta.env.VITE_STAKING_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL;
const RELAYER_URL = import.meta.env.VITE_RELAYER_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEPLOYMENT_BLOCK =
  parseInt(import.meta.env.VITE_STAKING_DEPLOYMENT_BLOCK, 10) || 0;
const USDT_DECIMALS = parseInt(import.meta.env.VITE_USDT_DECIMALS, 10) || 18;
const PLAN_REWARD_RATE = parseInt(import.meta.env.VITE_PLAN_REWARD_RATE, 10) || 20; // Default to 20%
const MIN_COMPOUND_AMOUNT = BigInt(import.meta.env.VITE_MIN_COMPOUND_AMOUNT || (5 * 10 ** USDT_DECIMALS)); // Default to 5 USDT in wei

// Validate environment variables
const requiredEnvVars = {
  VITE_USDT_ADDRESS: USDT_ADDRESS,
  VITE_STAKING_ADDRESS: STAKING_ADDRESS,
  VITE_RPC_URL: RPC_URL,
  VITE_RELAYER_URL: RELAYER_URL,
  VITE_API_BASE_URL: API_BASE_URL,
  VITE_STAKING_DEPLOYMENT_BLOCK: DEPLOYMENT_BLOCK.toString(),
  VITE_USDT_DECIMALS: USDT_DECIMALS.toString(),
  VITE_PLAN_REWARD_RATE: PLAN_REWARD_RATE.toString(),
  VITE_MIN_COMPOUND_AMOUNT: MIN_COMPOUND_AMOUNT.toString(),
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error("Rewards.jsx: Missing environment variables:", missingEnvVars);
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

// Validate contract addresses
if (!ethers.isAddress(USDT_ADDRESS)) {
  console.error("Rewards.jsx: Invalid USDT contract address:", USDT_ADDRESS);
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(STAKING_ADDRESS)) {
  console.error(
    "Rewards.jsx: Invalid Staking contract address:",
    STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Hardhat provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract instances
const usdtContract = new ethers.Contract(USDT_ADDRESS, MockUSDTABI, provider);
const stakingContract = new ethers.Contract(
  STAKING_ADDRESS,
  StakingContractABI,
  provider
);

// Constants from StakingContract
const BLOCKS_PER_DAY = 6646;
const PLAN_DURATION = 5 * BLOCKS_PER_DAY; // 33230 blocks

// Check suspension status
const checkSuspensionStatus = async (userAddress) => {
  if (!ethers.isAddress(userAddress)) {
    console.error("Rewards.jsx: Invalid user address:", userAddress);
    return { isSuspended: false, reason: null };
  }

  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        "Fetching suspension status for:",
        `${API_BASE_URL}/api/check-suspension/${userAddress.toLowerCase()}`
      );
      const response = await fetch(
        `${API_BASE_URL}/api/check-suspension/${userAddress.toLowerCase()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Rewards.jsx: Suspension check error", {
          status: response.status,
          errorText,
          attempt,
        });
        if (response.status === 404) {
          console.warn(
            "Suspension API endpoint not found. Check server route: /api/check-suspension/:address"
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Rewards.jsx: Suspension status fetched", data);
      return data; // { isSuspended: boolean, reason: string, suspendedAt: Date }
    } catch (err) {
      console.error("Rewards.jsx: Failed to check suspension status:", {
        message: err.message,
        stack: err.stack,
        attempt,
      });

      if (attempt === maxRetries) {
        console.warn("Rewards.jsx: Max retries reached for suspension check");
        return { isSuspended: false, reason: null }; // Default to not suspended
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

// Custom debounce function
const debounce = (func, wait) => {
  let timeout;

  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
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
  if (stake.amountWei <= 0n && stake.accruedReward <= 0n) {
    return { label: "Unstaked", color: "bg-slate-600" };
  }
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const stakeEndTime = stake.startTimestamp + BigInt(5 * 86400);
  if (currentTime < stakeEndTime) {
    return { label: "Locked", color: "bg-cyan-600" };
  }
  return { label: "Completed", color: "bg-green-600" };
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

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// Error boundary component
function ErrorFallback({ error }) {
  return (
    <div className="flex items-center justify-center bg-slate-900 p-4 text-slate-200 w-full min-w-0">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          Something went wrong
        </h2>
        <p>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 text-xs sm:text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Retry wrapper for RPC calls with exponential backoff
const withRetry = async (fn, retries = 3, baseDelay = 1000) => {
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err.message.includes("rate limit")) {
        console.warn(`Rate limit hit, retrying after ${baseDelay * 2 ** i}ms`);
        await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** i));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
};

// Check transaction status
const checkTransactionStatus = async (txHash) => {
  try {
    const receipt = await withRetry(() =>
      provider.getTransactionReceipt(txHash)
    );
    if (receipt && receipt.status === 1) {
      console.log("Transaction Confirmed:", txHash);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error checking transaction status:", err);
    return false;
  }
};

export default function Rewards() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [usdtBalance, setUsdtBalance] = useState(0n);
  const [stakeCount, setStakeCount] = useState(0n);
  const [stakes, setStakes] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [isBatchWithdrawLoading, setIsBatchWithdrawLoading] = useState(false);
  const [isCompoundLoading, setIsCompoundLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStake, setSelectedStake] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const [claimHistory, setClaimHistory] = useState([]);
  const [isSuspended, setIsSuspended] = useState({
    isSuspended: false,
    reason: null,
  });

  // Set app element for modal and check suspension status
  useEffect(() => {
    try {
      ReactModal.setAppElement("#root");
      setTimeout(() => setIsLoading(false), 1500);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }

    if (account?.address && ethers.isAddress(account.address)) {
      checkSuspensionStatus(account.address)
        .then((suspension) => {
          setIsSuspended(suspension);
        })
        .catch((err) => {
          console.error("Rewards.jsx: Initial suspension check failed:", err);
          setIsSuspended({ isSuspended: false, reason: null });
        });
    }
  }, [account]);

  // Fetch stakes with retries and validation
  const fetchStakes = async (accountAddress, count) => {
    console.log("fetchStakes called:", { accountAddress, count });
    if (!accountAddress || count <= 0 || !ethers.isAddress(accountAddress)) {
      console.log("fetchStakes returning empty array (invalid input)");
      return [];
    }

    if (count > Number.MAX_SAFE_INTEGER) {
      console.error(
        "fetchStakes: Stake count exceeds safe integer limit:",
        count
      );
      throw new Error("Stake count too large for processing");
    }

    const stakesData = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        for (let i = 0; i < count; i++) {
          console.log("Fetching stake index:", i);
          const [stake, pendingReward] = await Promise.all([
            stakingContract.stakes(accountAddress, i),
            stakingContract.calculateReward(accountAddress, i),
          ]);
          console.log("Stake data for index", i, ":", {
            amount: formatUSDT(stake.amount),
            startTimestamp: stake.startTimestamp.toString(),
            lastRewardUpdate: stake.lastRewardUpdate.toString(),
            accruedReward: formatUSDT(stake.accruedReward),
            pendingReward: formatUSDT(pendingReward),
          });

          const amountWei = BigInt(stake.amount || 0);
          const accruedReward = BigInt(stake.accruedReward || 0);
          const startTimestamp = BigInt(stake.startTimestamp || 0);
          const lastRewardUpdate = BigInt(stake.lastRewardUpdate || 0);
          const pendingRewardWei = BigInt(pendingReward || 0);

          // Validate BigInt values
          if (amountWei < 0n || accruedReward < 0n || pendingRewardWei < 0n) {
            console.error(
              `fetchStakes: Negative value detected for stake ${i}`,
              {
                amountWei,
                accruedReward,
                pendingRewardWei,
              }
            );
            throw new Error(`Negative value in stake ${i} data`);
          }
          if (
            startTimestamp >
            BigInt(Math.floor(Date.now() / 1000)) + 31536000n
          ) {
            console.warn(
              `fetchStakes: Suspiciously large startTimestamp for stake ${i}:`,
              startTimestamp.toString()
            );
          }

          // Include stakes with accruedReward even if amount is 0
          if (amountWei === 0n && accruedReward > 0n) {
            console.log(
              `fetchStakes: Including unstaked stake ${i} with claimable accruedReward: ${formatUSDT(
                accruedReward
              )} USDT`
            );
          }

          stakesData.push({
            id: i,
            amount: formatUSDT(amountWei),
            amountWei,
            startTimestamp,
            lastRewardUpdate,
            startBlock: startTimestamp,
            accruedReward,
            pendingReward: pendingRewardWei,
          });
        }
        console.log("fetchStakes successful:", stakesData);
        return stakesData;
      } catch (err) {
        console.error(
          "fetchStakes error on attempt",
          attempt,
          ":",
          err.message
        );
        if (attempt === 3) {
          throw new Error(
            `Failed to fetch stakes after ${attempt} attempts: ${err.message}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  // Fetch claim history with pagination and caching
  const fetchClaimHistory = async (accountAddress) => {
    console.log("fetchClaimHistory called:", {
      accountAddress,
      deploymentBlock: DEPLOYMENT_BLOCK,
    });
    if (!accountAddress || !ethers.isAddress(accountAddress)) {
      console.log("fetchClaimHistory returning empty array (invalid input)");
      return [];
    }

    try {
      const startTime = performance.now();
      const latestBlock = await withRetry(() => provider.getBlockNumber());
      const fromBlock = DEPLOYMENT_BLOCK;
      const blockChunkSize = 250;
      const allEvents = [];

      console.log(
        `Fetching RewardWithdrawn events from block ${fromBlock} to ${latestBlock}`
      );

      const chunkPromises = [];
      for (
        let startBlock = fromBlock;
        startBlock <= latestBlock;
        startBlock += blockChunkSize
      ) {
        const endBlock = Math.min(startBlock + blockChunkSize - 1, latestBlock);
        chunkPromises.push(
          (async () => {
            console.log(`Querying blocks ${startBlock} to ${endBlock}`);
            const filter =
              stakingContract.filters.RewardWithdrawn(accountAddress);
            try {
              const events = await withRetry(
                () => stakingContract.queryFilter(filter, startBlock, endBlock),
                5,
                2000
              );
              console.log(
                `Fetched ${events.length} events for blocks ${startBlock} to ${endBlock}`
              );
              return events;
            } catch (err) {
              console.warn(
                `Failed to fetch events for blocks ${startBlock} to ${endBlock}:`,
                err.message
              );
              return [];
            }
          })()
        );
      }

      const chunkEvents = await Promise.all(chunkPromises);
      chunkEvents.forEach((events) => allEvents.push(...events));

      if (allEvents.length === 0) {
        console.log(
          "No RewardWithdrawn events found for address:",
          accountAddress
        );
      } else {
        console.log(
          `Total RewardWithdrawn events fetched: ${allEvents.length}`
        );
      }

      const claimHistoryData = allEvents
        .map((event, index) => {
          try {
            const amount = BigInt(event.args.reward);
            const timestamp = BigInt(event.args.timestamp);
            if (amount <= 0n || timestamp <= 0n) {
              console.warn(`Invalid event data at index ${index}:`, event.args);
              return null;
            }
            const uniqueId = `${event.transactionHash}-${event.logIndex}`;
            return {
              id: uniqueId,
              amount,
              timestamp,
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
              logIndex: event.logIndex,
            };
          } catch (err) {
            console.error(
              `Error processing event at index ${index}:`,
              err.message,
              event
            );
            return null;
          }
        })
        .filter((claim) => claim !== null)
        .sort((a, b) => {
          const blockDiff = b.blockNumber - a.blockNumber;
          return blockDiff !== 0 ? blockDiff : b.logIndex - a.logIndex;
        });

      const endTime = performance.now();
      console.log("fetchClaimHistory successful:", {
        claimCount: claimHistoryData.length,
        duration: `${((endTime - startTime) / 1000).toFixed(2)} seconds`,
        claims: claimHistoryData.map((claim) => ({
          id: claim.id,
          amount: formatUSDT(claim.amount),
          timestamp: claim.timestamp.toString(),
          txHash: claim.txHash,
          blockNumber: claim.blockNumber,
          logIndex: claim.logIndex,
        })),
      });

      return claimHistoryData;
    } catch (err) {
      console.error("fetchClaimHistory error:", err.message, err.stack);
      let errorMessage = "Failed to fetch claim history.";
      if (err.message.includes("rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (
        err.message.includes("block range") ||
        err.message.includes("too many")
      ) {
        errorMessage = "Error fetching event logs. Try refreshing.";
      }
      toast.error(errorMessage);
      return [];
    }
  };

  // Fetch current block number
  const fetchCurrentBlock = async () => {
    try {
      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (err) {
      console.error("Rewards.jsx: fetchCurrentBlock error:", err);
      return 0;
    }
  };

  // Update state periodically with debounced refresh
  const updateState = async () => {
    if (account?.address && ethers.isAddress(account.address)) {
      try {
        const startTime = performance.now();
        const [balance, count, claims] = await Promise.all([
          withRetry(() => usdtContract.balanceOf(account.address)),
          withRetry(() => stakingContract.getUserStakeCount(account.address)),
          fetchClaimHistory(account.address),
        ]);
        const countBigInt = BigInt(count);
        console.log("Fetched data:", {
          balance: formatUSDT(balance),
          stakeCount: countBigInt.toString(),
          newClaims: claims.map((claim) => ({
            id: claim.id,
            amount: formatUSDT(claim.amount),
            timestamp: claim.timestamp.toString(),
            txHash: claim.txHash,
            blockNumber: claim.blockNumber,
            logIndex: claim.logIndex,
          })),
        });

        if (countBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.error(
            "updateState: Stake count exceeds safe integer limit:",
            countBigInt.toString()
          );
          throw new Error("Stake count too large for processing");
        }

        setUsdtBalance(BigInt(balance));
        setStakeCount(countBigInt);
        setClaimHistory((prev) => {
          const allClaims = [...prev, ...claims]
            .filter(
              (claim, index, self) =>
                claim && index === self.findIndex((c) => c && c.id === claim.id)
            )
            .sort((a, b) => {
              const blockDiff = b.blockNumber - a.blockNumber;
              return blockDiff !== 0 ? blockDiff : b.logIndex - a.logIndex;
            });
          console.log("Updated claimHistory:", {
            count: allClaims.length,
            claims: allClaims.map((claim) => ({
              id: claim.id,
              amount: formatUSDT(claim.amount),
              timestamp: claim.timestamp.toString(),
              txHash: claim.txHash,
              blockNumber: claim.blockNumber,
              logIndex: claim.logIndex,
            })),
          });
          return allClaims;
        });

        const stakesData = await fetchStakes(
          account.address,
          Number(countBigInt)
        );
        console.log("Stakes updated:", stakesData);
        setStakes(stakesData);

        const block = await fetchCurrentBlock();
        setCurrentBlock(block);

        const endTime = performance.now();
        console.log(
          `updateState completed in ${((endTime - startTime) / 1000).toFixed(
            2
          )} seconds`
        );
      } catch (err) {
        console.error(
          "Rewards.jsx: Failed to update state:",
          err.message,
          err.stack
        );
        toast.error(`Failed to fetch data: ${err.message}`);
        setError(err);
      }
    } else {
      console.log("Skipping state update (no account)");
      setStakes([]);
      setClaimHistory([]);
    }
  };
  const debouncedUpdateState = debounce(updateState, 1000);

  useEffect(() => {
    debouncedUpdateState();
    const intervalId = setInterval(debouncedUpdateState, 60000);
    console.log("Started state update interval, ID:", intervalId);
    return () => {
      console.log("Clearing state update interval, ID:", intervalId);
      clearInterval(intervalId);
      debouncedUpdateState.cancel();
    };
  }, [account, refreshTrigger]);

  // Gasless transaction handler
  const handleGaslessTransaction = async ({
    functionName,
    primaryType,
    amountBigInt,
    nonce,
    deadline,
    stakeIndex = 0,
    stakeIndices = [],
  }) => {
    if (!account || !wallet) {
      throw new Error("Please connect your wallet");
    }

    const domain = {
      name: "StakingContract",
      version: "1",
      chainId: parseInt(import.meta.env.VITE_CHAIN_ID, 10),
      verifyingContract: STAKING_ADDRESS,
    };

    const types =
      primaryType === "WithdrawReward"
        ? {
            WithdrawReward: [
              { name: "user", type: "address" },
              { name: "stakeIndex", type: "uint256" },
              { name: "amount", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          }
        : primaryType === "BatchWithdrawRewards"
        ? {
            BatchWithdrawRewards: [
              { name: "user", type: "address" },
              { name: "stakeIndices", type: "uint256[]" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          }
        : {
            Compound: [
              { name: "user", type: "address" },
              { name: "stakeIndex", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          };

    const message =
      primaryType === "WithdrawReward"
        ? {
            user: account.address,
            stakeIndex: stakeIndex.toString(),
            amount: amountBigInt.toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString(),
          }
        : primaryType === "BatchWithdrawRewards"
        ? {
            user: account.address,
            stakeIndices: stakeIndices.map((i) => i.toString()),
            nonce: nonce.toString(),
            deadline: deadline.toString(),

          }
        : {
            user: account.address,
            stakeIndex: stakeIndex.toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString(),
          };

    console.log("EIP-712 Payload:", {
      domain,
      types,
      primaryType,
      message,
    });

    if (Number(message.deadline) < Math.floor(Date.now() / 1000)) {
      throw new Error("Transaction deadline has expired");
    }
    if (!ethers.isAddress(message.user)) {
      throw new Error(`Invalid address in EIP-712 ${primaryType} message`);
    }

    let signature;
    try {
      signature = await account.signTypedData({
        domain,
        types,
        primaryType,
        message,
      });
      console.log("Raw Signature:", signature);
      if (!signature.match(/^0x[a-fA-F0-9]{130}$/)) {
        throw new Error(`Invalid signature format: ${signature}`);
      }
    } catch (signErr) {
      console.error("signTypedData Error:", signErr);
      throw new Error("Failed to sign transaction: " + signErr.message);
    }

    try {
      const recovered = ethers.verifyTypedData(
        domain,
        types,
        message,
        signature
      );
      console.log("Recovered address:", recovered);
      if (recovered.toLowerCase() !== account.address.toLowerCase()) {
        throw new Error(
          `Signature does not recover to user address: ${recovered}`
        );
      }
    } catch (verifyErr) {
      console.error("Signature verification failed:", verifyErr);
      throw new Error("Invalid signature generated");
    }

    const args =
      primaryType === "WithdrawReward"
        ? [message.user, message.stakeIndex, message.amount, message.deadline]
        : primaryType === "BatchWithdrawRewards"
        ? [message.user, message.stakeIndices, message.deadline]
        : [message.user, message.stakeIndex, message.deadline];

    const sig = ethers.Signature.from(signature);
    const fullArgs = [...args, sig.v, sig.r, sig.s];

    console.log("Relayer Request:", {
      contractAddress: STAKING_ADDRESS,
      functionName,
      args: fullArgs,
      userAddress: account.address,
      signature,
    });

    const retryFetch = async (url, retries = 3, delay = 1000) => {
      const requestBody = {
        contractAddress: STAKING_ADDRESS,
        functionName,
        args: fullArgs,
        userAddress: account.address,
        signature,
        chainId: parseInt(import.meta.env.VITE_CHAIN_ID, 10),
      };

      let lastError = null;
      for (let i = 1; i <= retries; i++) {
        try {
          console.log(
            `Relayer Attempt ${i}: Sending request to ${url}`,
            requestBody
          );
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              `Relayer error: ${
                errorData.error || response.statusText || "Unknown error"
              }`
            );
          }
          const result = await response.json();
          console.log(`Relayer Response (Attempt ${i}):`, result);
          if (result.txHash) {
            setPendingTx(result.txHash);
          }
          return result;
        } catch (err) {
          console.warn(`Relayer Attempt ${i} Failed: ${err.message}`);
          lastError = err;
          if (i === retries) {
            if (pendingTx) {
              const txConfirmed = await checkTransactionStatus(pendingTx);
              if (txConfirmed) {
                console.log(
                  "Transaction succeeded despite relayer error:",
                  pendingTx
                );
                return { txHash: pendingTx, success: true };
              }
            }
            throw new Error(
              `Failed to connect to relayer after ${retries} attempts: ${err.message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
        }
      }
    };

    try {
      const result = await retryFetch(RELAYER_URL);
      if (result.txHash) {
        const receipt = await provider.waitForTransaction(
          result.txHash,
          1,
          60000
        );
        if (receipt.status !== 1) {
          try {
            const tx = await provider.getTransaction(result.txHash);
            await provider.call(tx, tx.blockNumber);
          } catch (callErr) {
            throw new Error(
              `Transaction reverted: ${callErr.reason || callErr.message}`
            );
          }
          throw new Error("Transaction failed to confirm on-chain");
        }
      } else if (!result.success) {
        throw new Error("Relayer did not confirm success");
      }
      return { signature, txHash: result.txHash, success: result.success };
    } catch (err) {
      console.error("Relayer Communication Failed:", err);
      let errorMessage = "Failed to process transaction.";
      if (err.message.includes("Missing required fields")) {
        errorMessage = "Invalid transaction data. Please try again.";
      } else if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Transaction reverted")) {
        errorMessage = err.message;
      }
      throw new Error(errorMessage);
    } finally {
      setPendingTx(null);
    }
  };

  // Handle withdraw reward
  const handleClaimRewards = async (stakeId) => {
    const stake = stakes.find((s) => s.id === stakeId);
    console.log("handleClaimRewards called:", {
      stakeId,
      amountWei: stake.amountWei.toString(),
      accruedReward: formatUSDT(stake.accruedReward),
      pendingReward: formatUSDT(stake.pendingReward),
      status: getStakeStatus(stake).label,
    });

    // Check suspension status
    try {
      const suspension = await checkSuspensionStatus(account.address);
      if (suspension.isSuspended) {
        console.log("handleClaimRewards: User is suspended", suspension);
        toast.error(
          `Your account is suspended. Reason: ${
            suspension.reason || "Not provided"
          }.`
        );
        return;
      }
    } catch (err) {
      console.error("handleClaimRewards: Suspension check failed:", err);
      toast.error("Failed to verify account status. Please try again.");
      return;
    }

    try {
      const contractStake = await stakingContract.stakes(
        account.address,
        stakeId
      );
      const contractPendingReward = await stakingContract.calculateReward(
        account.address,
        stakeId
      );
      console.log("Contract stake state:", {
        amount: formatUSDT(contractStake.amount),
        accruedReward: formatUSDT(contractStake.accruedReward),
        pendingReward: formatUSDT(contractPendingReward),
      });
      if (
        BigInt(contractStake.accruedReward) + BigInt(contractPendingReward) ===
        0n
      ) {
        console.log("handleClaimRewards: No rewards to claim");
        toast.error("No rewards to_claim for this stake.");
        return;
      }
      if (
        BigInt(contractStake.amount) !== stake.amountWei ||
        BigInt(contractStake.accruedReward) !== stake.accruedReward
      ) {
        console.warn(
          `Rewards.jsx: State mismatch for stake ${stakeId}. Frontend amount: ${formatUSDT(
            stake.amountWei
          )}, Contract amount: ${formatUSDT(
            contractStake.amount
          )}, Frontend accruedReward: ${formatUSDT(
            stake.accruedReward
          )}, Contract accruedReward: ${formatUSDT(
            contractStake.accruedReward
          )}`
        );
        toast.error("Stake state mismatch. Refreshing data...");
        setRefreshTrigger((prev) => prev + 1);
        return;
      }
    } catch (err) {
      console.error(
        "handleClaimRewards: Failed to validate contract state:",
        err
      );
      toast.error("Failed to verify stake state. Please try again.");
      return;
    }

    const totalReward = stake.accruedReward + stake.pendingReward;
    if (totalReward <= 0n) {
      console.log("handleClaimRewards: No rewards to claim");
      toast.error("No rewards to claim.");
      return;
    }

    if (pendingTx) {
      console.log("handleClaimRewards: Transaction already pending");
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsWithdrawLoading(true);
    const toastId = toast.loading("Withdrawing rewards...");
    try {
      const amountBigInt = totalReward;
      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
      console.log(
        "Withdraw Reward Nonce:",
        nonce.toString(),
        "Deadline:",
        deadline,
        "Amount:",
        formatUSDT(totalReward)
      );

      const result = await handleGaslessTransaction({
        functionName: "executeMetaWithdrawReward",
        primaryType: "WithdrawReward",
        amountBigInt,
        nonce,
        deadline,
        stakeIndex: stakeId,
      });

      if (result.txHash) {
        await checkTransactionStatus(result.txHash);
      }
      console.log("Withdraw Reward Transaction Hash:", result.txHash);
      toast.success(
        `Successfully withdrew ${formatUSDT(totalReward)} USDT rewards!`,
        { id: toastId }
      );

      const updatedStakes = stakes.map((s) =>
        s.id === stakeId
          ? {
              ...s,
              accruedReward: 0n,
              pendingReward: 0n,
            }
          : s
      );
      setStakes(updatedStakes);

      const count = await stakingContract.getUserStakeCount(account.address);
      const newStakes = await fetchStakes(account.address, Number(count));
      setStakes(newStakes);
    } catch (err) {
      console.error("Withdraw Reward Error:", err);
      let errorMessage = "Failed to withdraw rewards.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Insufficient accrued rewards")) {
        errorMessage = "Insufficient rewards to claim.";
      } else if (err.message.includes("Account is suspended")) {
        errorMessage = err.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  // Handle claim all rewards
  const handleClaimAllRewards = async () => {
    try {
      const suspension = await checkSuspensionStatus(account.address);
      if (suspension.isSuspended) {
        console.log("handleClaimAllRewards: User is suspended", suspension);
        toast.error(
          `Your account is suspended. Reason: ${
            suspension.reason || "Not provided"
          }.`
        );
        return;
      }
    } catch (err) {
      console.error("handleClaimAllRewards: Suspension check failed:", err);
      toast.error("Failed to verify account status. Please try again.");
      return;
    }

    const eligibleStakes = stakes.filter(
      (stake) => stake.accruedReward + stake.pendingReward > 0n
    );
    const totalClaimable = eligibleStakes.reduce(
      (sum, stake) => sum + stake.accruedReward + stake.pendingReward,
      0n
    );
    console.log("handleClaimAllRewards:", {
      totalClaimable: formatUSDT(totalClaimable),
      eligibleStakes: eligibleStakes.map((s) => ({
        id: s.id,
        amountWei: s.amountWei.toString(),
        accruedReward: formatUSDT(s.accruedReward), // Corrected line
        pendingReward: formatUSDT(s.pendingReward),
      })),
    });

    if (totalClaimable <= 0n) {
      console.log("handleClaimAllRewards: No rewards to claim");
      toast.error("No rewards to claim.");
      return;
    }

    const stakeIndices = eligibleStakes.map((stake) => stake.id);
    if (stakeIndices.length === 0) {
      console.log("handleClaimAllRewards: No rewards available to withdraw");
      toast.error("No rewards available to withdraw");
      return;
    }
    if (pendingTx) {
      console.log("handleClaimAllRewards: Transaction already pending");
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsBatchWithdrawLoading(true);
    const toastId = toast.loading("Withdrawing all rewards...");
    try {
      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
      console.log(
        "Batch Withdraw Nonce:",
        nonce.toString(),
        "Deadline:",
        deadline,
        "Stake Indices:",
        stakeIndices
      );

      const result = await handleGaslessTransaction({
        functionName: "executeMetaBatchWithdrawRewards",
        primaryType: "BatchWithdrawRewards",
        amountBigInt: 0n,
        nonce,
        deadline,
        stakeIndices,
      });

      if (result.txHash) {
        await checkTransactionStatus(result.txHash);
      }
      console.log("Batch Withdraw Transaction Hash:", result.txHash);
      toast.success(`Successfully withdrew all rewards!`, { id: toastId });

      const updatedStakes = stakes.map((stake) => {
        if (stakeIndices.includes(stake.id)) {
          return {
            ...stake,
            accruedReward: 0n,
            pendingReward: 0n,
          };
        }
        return stake;
      });
      setStakes(updatedStakes);

      const count = await stakingContract.getUserStakeCount(account.address);
      const newStakes = await fetchStakes(account.address, Number(count));
      setStakes(newStakes);
    } catch (err) {
      console.error("Batch Withdraw Error:", err);
      let errorMessage = "Failed to withdraw all rewards.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Account is suspended")) {
        errorMessage = err.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsBatchWithdrawLoading(false);
    }
  };

  // Handle compound
  const handleCompound = async (stakeId) => {
    const stake = stakes.find((s) => s.id === stakeId);
    console.log("handleCompound called:", {
      stakeId,
      amountWei: stake.amountWei.toString(),
      accruedReward: formatUSDT(stake.accruedReward),
      pendingReward: formatUSDT(stake.pendingReward),
      status: getStakeStatus(stake).label,
    });

    try {
      const suspension = await checkSuspensionStatus(account.address);
      if (suspension.isSuspended) {
        console.log("handleCompound: User is suspended", suspension);
        toast.error(
          `Your account is suspended. Reason: ${
            suspension.reason || "Not provided"
          }.`
        );
        return;
      }
    } catch (err) {
      console.error("handleCompound: Suspension check failed:", err);
      toast.error("Failed to verify account status. Please try again.");
      return;
    }

    try {
      const contractStake = await stakingContract.stakes(
        account.address,
        stakeId
      );
      if (BigInt(contractStake.amount) === 0n) {
        console.log(
          "handleCompound: Contract confirms stake is unstaked, aborting"
        );
        toast.error("Cannot compound rewards for an unstaked stake.");
        return;
      }
    } catch (err) {
      console.error("handleCompound: Failed to validate contract state:", err);
      toast.error("Failed to verify stake state. Please try again.");
      return;
    }

    if (stake.amountWei <= 0n) {
      console.log("handleCompound: Stake is unstaked, aborting");
      toast.error("Cannot compound rewards for an unstaked stake.");
      return;
    }

    const totalReward = stake.accruedReward + stake.pendingReward;
    if (totalReward < MIN_COMPOUND_AMOUNT) {
      console.log("handleCompound: Insufficient rewards for compounding");
      toast.error(
        `Minimum ${formatUSDT(MIN_COMPOUND_AMOUNT)} USDT required to compound.`
      );
      return;
    }
    if (pendingTx) {
      console.log("handleCompound: Transaction already pending");
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsCompoundLoading(true);
    const toastId = toast.loading("Compounding rewards...");
    try {
      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
      console.log("Compound Nonce:", nonce.toString(), "Deadline:", deadline);

      const result = await handleGaslessTransaction({
        functionName: "executeMetaCompound",
        primaryType: "Compound",
        amountBigInt: 0n,
        nonce,
        deadline,
        stakeIndex: stakeId,
      });

      if (result.txHash) {
        await checkTransactionStatus(result.txHash);
      }
      console.log("Compound Transaction Hash:", result.txHash);
      toast.success("Successfully compounded rewards!", { id: toastId });

      const updatedStakes = stakes.map((s) =>
        s.id === stakeId
          ? {
              ...s,
              amountWei: s.amountWei + totalReward,
              amount: formatUSDT(s.amountWei + totalReward),
              accruedReward: 0n,
              pendingReward: 0n,
            }
          : s
      );
      setStakes(updatedStakes);

      const count = await stakingContract.getUserStakeCount(account.address);
      const newStakes = await fetchStakes(account.address, Number(count));
      setStakes(newStakes);
    } catch (err) {
      console.error("Compound Error:", err);
      let errorMessage = "Failed to compound rewards.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Account is suspended")) {
        errorMessage = err.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsCompoundLoading(false);
    }
  };

  // Line chart data
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
          label: "Projected Rewards (USDT)",
          data: totalRewards,
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stakes]);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-slate-900 p-4 w-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-4 border-cyan-600"></div>
      </div>
    );
  }

  console.log("Rendering main UI");
  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 py-8 bg-slate-900 min-w-0">
      {isSuspended.isSuspended && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
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
        className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-200 mb-6 sm:mb-8 font-geist"
      >
        Rewards
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 w-full">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(0)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Total Rewards
          </h3>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <DollarSign className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-xs sm:text-sm font-geist-mono">
                Available Rewards
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white font-geist">
                $
                {formatUSDT(
                  stakes.reduce(
                    (sum, stake) =>
                      sum + stake.accruedReward + stake.pendingReward,
                    0n
                  )
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClaimAllRewards}
            disabled={
              isBatchWithdrawLoading ||
              isSuspended.isSuspended ||
              stakes.reduce(
                (sum, stake) => sum + stake.accruedReward + stake.pendingReward,
                0n
              ) <= 0n
            }
            className={`group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm ${
              isBatchWithdrawLoading ||
              isSuspended.isSuspended ||
              stakes.reduce(
                (sum, stake) => sum + stake.accruedReward + stake.pendingReward,
                0n
              ) <= 0n
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            aria-label="Claim all rewards"
          >
            Claim All Rewards
            <ArrowRight className="ml-2 w-3 sm:w-4 h-3 sm:h-4" />
          </button>
          <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4 font-geist-mono">
            Balance: {formatUSDT(usdtBalance)} USDT
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(1)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Staking Summary
          </h3>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <DollarSign className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-xs sm:text-sm font-geist-mono">
                Total Staked
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white font-geist">
                $
                {formatUSDT(
                  stakes.reduce((sum, stake) => sum + stake.amountWei, 0n)
                )}
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
             Stakes:{" "}
            {stakes.filter((stake) => stake.amountWei > 0n).length}
          </p>
        </motion.div>
      </div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(2)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 w-full"
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
          Reward Accrual
        </h3>
        <div className="w-full h-[200px] sm:h-[300px] md:h-[350px]">
          <Line
            data={lineChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: "#e2e8f0",
                    font: { size: 10, family: "Geist Mono" },
                  },
                },
                tooltip: {
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  titleFont: { size: 10, family: "Geist Mono" },
                  bodyFont: { size: 10, family: "Geist Mono" },
                  callbacks: {
                    label: (context) =>
                      `${context.dataset.label}: ${context.parsed.y.toFixed(
                        2
                      )} USDT`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: "#e2e8f0",
                    font: { size: 10, family: "Geist Mono" },
                  },
                  grid: { color: "rgba(103, 232, 249, 0.1)" },
                },
                y: {
                  ticks: {
                    color: "#e2e8f0",
                    font: { size: 10, family: "Geist Mono" },
                  },
                  grid: { color: "rgba(103, 232, 249, 0.1)" },
                },
              },
            }}
          />
        </div>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(3)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 w-full"
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
            Rewards History
          </h3>
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="text-cyan-600 hover:text-cyan-500"
            aria-label="Refresh rewards history"
          >
            <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5" />
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
                  Accrued Rewards
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Pending Rewards
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">Status</th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakes.map((stake) => {
                const { label, color } = getStakeStatus(stake);
                return (
                  <tr key={stake.id} className="border-b border-cyan-700/30">
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      <button
                        onClick={() => setSelectedStake(stake)}
                        className="text-cyan-600 hover:underline"
                        data-tooltip-id={`stake-tooltip-${stake.id}`}
                        data-tooltip-content="View stake details"
                        aria-label={`View stake ${stake.id} details`}
                      >
                        {stake.id}
                      </button>
                      <Tooltip
                        id={`stake-tooltip-${stake.id}`}
                        place="top"
                        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
                        style={{ fontFamily: "Geist Mono" }}
                      />
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
                      {formatUSDT(stake.accruedReward)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      {formatUSDT(stake.pendingReward)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs sm:text-sm ${color} text-slate-200`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={() => handleClaimRewards(stake.id)}
                        disabled={
                          isWithdrawLoading ||
                          isSuspended.isSuspended ||
                          stake.accruedReward + stake.pendingReward <= 0n
                        }
                        className={`text-xs sm:text-sm text-cyan-600 hover:underline ${
                          isWithdrawLoading ||
                          isSuspended.isSuspended ||
                          stake.accruedReward + stake.pendingReward <= 0n
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        data-tooltip-id={`claim-tooltip-${stake.id}`}
                        data-tooltip-content="Claim rewards for this stake"
                        aria-label={`Claim rewards for stake ${stake.id}`}
                      >
                        Claim
                      </button>
                      <Tooltip
                        id={`claim-tooltip-${stake.id}`}
                        place="top"
                        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
                        style={{ fontFamily: "Geist Mono" }}
                      />
                      <button
                        onClick={() => handleCompound(stake.id)}
                        disabled={
                          isCompoundLoading ||
                          isSuspended.isSuspended ||
                          stake.amountWei <= 0n ||
                          stake.accruedReward + stake.pendingReward <
                            MIN_COMPOUND_AMOUNT
                        }
                        className={`text-xs sm:text-sm text-cyan-600 hover:underline ${
                          isCompoundLoading ||
                          isSuspended.isSuspended ||
                          stake.amountWei <= 0n ||
                          stake.accruedReward + stake.pendingReward <
                            MIN_COMPOUND_AMOUNT
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        data-tooltip-id={`compound-tooltip-${stake.id}`}
                        data-tooltip-content={
                          stake.amountWei <= 0n
                            ? "Cannot compound: Stake is unstaked"
                            : "Compound rewards for this stake"
                        }
                        aria-label={`Compound rewards for stake ${stake.id}`}
                      >
                        Compound
                      </button>
                      <Tooltip
                        id={`compound-tooltip-${stake.id}`}
                        place="top"
                        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
                        style={{ fontFamily: "Geist Mono" }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {stakes.length === 0 && (
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            No stakes found.
          </p>
        )}
        {stakes.some(
          (stake) => stake.amountWei <= 0n && stake.accruedReward > 0n
        ) && (
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            Note: Unstaked stakes may have claimable rewards. Early unstaking
            incurs a 50% reward penalty.
          </p>
        )}
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(4)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full"
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
            Claim History
          </h3>
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="text-cyan-600 hover:text-cyan-500"
            aria-label="Refresh claim history"
          >
            <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-cyan-700/30">
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Amount (USDT)
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Timestamp
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Transaction Hash
                </th>
              </tr>
            </thead>
            <tbody>
              {claimHistory.map((claim) => (
                <tr key={claim.id} className="border-b border-cyan-700/30">
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {formatUSDT(claim.amount)}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {new Date(
                      safeBigIntToNumber(claim.timestamp, "claim.timestamp") *
                        1000
                    ).toLocaleString()}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    <span
                      className="text-cyan-600 truncate"
                      title={claim.txHash}
                    >
                      {`${claim.txHash.slice(0, 6)}...${claim.txHash.slice(
                        -4
                      )}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {claimHistory.length === 0 && (
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            No claim history found.
          </p>
        )}
      </motion.div>

      <ReactModal
        isOpen={!!selectedStake}
        onRequestClose={() => setSelectedStake(null)}
        className="bg-slate-900 p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md md:max-w-lg w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        {selectedStake && (
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
                Stake #{selectedStake.id} Details
              </h3>
              <button
                onClick={() => setSelectedStake(null)}
                className="text-slate-400 hover:text-cyan-600"
                aria-label="Close modal"
              >
                <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
              </button>
            </div>
            <div className="text-slate-200 font-geist-mono text-xs sm:text-sm space-y-2 sm:space-y-3">
              <p>
                <span className="text-slate-400">Amount:</span>{" "}
                {selectedStake.amount} USDT
              </p>
              <p>
                <span className="text-slate-400">Start Time:</span>{" "}
                {selectedStake.startTimestamp === 0n
                  ? "-"
                  : new Date(
                      safeBigIntToNumber(
                        selectedStake.startTimestamp,
                        "selectedStake.startTimestamp"
                      ) * 1000
                    ).toLocaleString()}
              </p>
              <p>
                <span className="text-slate-400">Accrued Rewards:</span>{" "}
                {formatUSDT(selectedStake.accruedReward)} USDT
              </p>
              <p>
                <span className="text-slate-400">Pending Rewards:</span>{" "}
                {formatUSDT(selectedStake.pendingReward)} USDT
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{" "}
                {getStakeStatus(selectedStake).label}
              </p>
            </div>
          </motion.div>
        )}
      </ReactModal>
    </div>
  );
}