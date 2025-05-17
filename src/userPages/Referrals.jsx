import { useState, useEffect } from "react";
import { NavLink, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Copy,
  X,
  ArrowRight,
  DollarSign,
  RefreshCw,
} from "lucide-react";
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

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
  VITE_RELAYER_URL: import.meta.env.VITE_RELAYER_URL,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_STAKING_DEPLOYMENT_BLOCK: import.meta.env.VITE_STAKING_DEPLOYMENT_BLOCK,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "Referrals.jsx: Missing environment variables:",
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
  VITE_RELAYER_URL,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_STAKING_DEPLOYMENT_BLOCK,
  VITE_USDT_DECIMALS,
} = requiredEnvVars;

// Validate contract addresses
if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "Referrals.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "Referrals.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("Referrals.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}

// Validate native currency decimals
const nativeCurrencyDecimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(nativeCurrencyDecimals) || nativeCurrencyDecimals < 0) {
  console.error(
    "Referrals.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}

// Validate USDT decimals
const USDT_DECIMALS = parseInt(VITE_USDT_DECIMALS, 10) || 6;
if (isNaN(USDT_DECIMALS) || USDT_DECIMALS < 0) {
  console.error("Referrals.jsx: Invalid USDT decimals:", VITE_USDT_DECIMALS);
  throw new Error("Invalid USDT decimals");
}

// Validate deployment block
const DEPLOYMENT_BLOCK =
  parseInt(VITE_STAKING_DEPLOYMENT_BLOCK, 10) || 48000000; // Assumed, verify via BscScan
if (isNaN(DEPLOYMENT_BLOCK) || DEPLOYMENT_BLOCK < 0) {
  console.error(
    "Referrals.jsx: Invalid staking deployment block:",
    VITE_STAKING_DEPLOYMENT_BLOCK
  );
  throw new Error("Invalid staking deployment block");
}

// Define Hardhat chain
const hardhatChain = defineChain({
  id: chainId,
  rpc: VITE_RPC_URL, // https://bsc-dataseed1.ninicoin.io/
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

// Hardhat provider
const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);

// Constants
const MIN_REFERRAL_WITHDRAWAL = BigInt(5 * 10 ** USDT_DECIMALS); // 5 USDT
const REFERRAL_BONUS = BigInt(0.5 * 10 ** USDT_DECIMALS); // 0.5 USDT
const DAY_IN_SECONDS = 86400;

// Custom debounce
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

// Error boundary
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

// Retry wrapper
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

export default function Referrals() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [referralBonus, setReferralBonus] = useState(0n);
  const [referrals, setReferrals] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [stakes, setStakes] = useState([]);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Contract data hooks
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
    },
  });

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
    },
  });

  const {
    data: stakingNonceData,
    isLoading: isStakingNonceLoading,
    error: stakingNonceError,
    refetch: refetchStakingNonce,
  } = useReadContract({
    contract: stakingContract,
    method: "nonces",
    params: [account?.address],
    queryOptions: {
      enabled: !!account && ethers.isAddress(account?.address),
      retry: 3,
      retryDelay: 1000,
    },
  });

  const {
    data: usdtBalanceData,
    isLoading: isUsdtBalanceLoading,
    error: usdtBalanceError,
    refetch: refetchUsdtBalance,
  } = useReadContract({
    contract: usdtContract,
    method: "balanceOf",
    params: [account?.address],
    queryOptions: {
      enabled: !!account && ethers.isAddress(account?.address),
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Handle referral logic
  useEffect(() => {
    console.log("Checking referral parameters, account:", account?.address);
    const refAddress = searchParams.get("ref");

    if (!account) {
      if (refAddress && ethers.isAddress(refAddress)) {
        console.log("Storing referrer address in localStorage:", refAddress);
        localStorage.setItem("referrerAddress", refAddress);
        navigate("/dashboard/staking");
      }
      return;
    }

    const storedReferrer = localStorage.getItem("referrerAddress");
    if (
      refAddress &&
      ethers.isAddress(refAddress) &&
      refAddress !== account.address
    ) {
      console.log("Setting referrer from URL:", refAddress);
      localStorage.removeItem("referrerAddress");
      navigate("/dashboard/staking");
    } else if (
      storedReferrer &&
      ethers.isAddress(storedReferrer) &&
      storedReferrer !== account.address
    ) {
      console.log("Setting referrer from localStorage:", storedReferrer);
      localStorage.removeItem("referrerAddress");
      navigate("/dashboard/staking");
    }
  }, [account, searchParams, navigate]);

  // Fetch referrals
  const fetchReferrals = async (accountAddress) => {
    if (!accountAddress || !ethers.isAddress(accountAddress)) return [];
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      console.log("Fetching referrals for:", accountAddress);
      const referrerFilter = contract.filters.ReferralRecorded(
        accountAddress,
        null
      );
      const referrerEvents = await withRetry(() =>
        contract.queryFilter(referrerFilter, DEPLOYMENT_BLOCK, "latest")
      );
      console.log(
        "Raw Referrer Events for",
        accountAddress,
        ":",
        referrerEvents
      );
      console.log(
        "Processed Referrer Events for",
        accountAddress,
        "as Referrer:",
        referrerEvents.map((event) => ({
          referrer: event.args.referrer,
          referee: event.args.referee,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }))
      );

      const refereeFilter = contract.filters.ReferralRecorded(
        null,
        accountAddress
      );
      const refereeEvents = await withRetry(() =>
        contract.queryFilter(refereeFilter, DEPLOYMENT_BLOCK, "latest")
      );
      console.log(
        "Processed Referee Events where",
        accountAddress,
        "is Referee:",
        refereeEvents.map((event) => ({
          referrer: event.args.referrer,
          referee: event.args.referee,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }))
      );

      const blockPromises = referrerEvents.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      const referralsData = referrerEvents
        .map((event, index) => ({
          address: `${event.args.referee.slice(
            0,
            6
          )}...${event.args.referee.slice(-4)}`,
          fullAddress: event.args.referee,
          referrer: event.args.referrer,
          timestamp: new Date(blocks[index].timestamp * 1000)
            .toISOString()
            .split("T")[0],
          bonus: REFERRAL_BONUS,
        }))
        .filter(
          (referral) =>
            referral.referrer.toLowerCase() === accountAddress.toLowerCase()
        )
        .reverse()
        .slice(0, 10);
      console.log(
        "Final Referrals Data for",
        accountAddress,
        ":",
        referralsData
      );
      return referralsData;
    } catch (err) {
      console.error("Referrals.jsx: fetchReferrals error:", err);
      toast.error("Failed to fetch referral history");
      return [];
    }
  };

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async (accountAddress) => {
    if (!accountAddress || !ethers.isAddress(accountAddress)) return [];
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    try {
      const filter = contract.filters.MetaReferralBonusWithdrawn(
        accountAddress,
        null
      );
      const events = await withRetry(() =>
        contract.queryFilter(filter, DEPLOYMENT_BLOCK, "latest")
      );
      const blockPromises = events.map((event) =>
        provider.getBlock(event.blockNumber)
      );
      const blocks = await Promise.all(blockPromises);
      return events
        .map((event, index) => ({
          amount: BigInt(event.args.amount),
          timestamp: new Date(blocks[index].timestamp * 1000)
            .toISOString()
            .split("T")[0],
          txHash: event.transactionHash,
        }))
        .reverse()
        .slice(0, 10);
    } catch (err) {
      console.error("Referrals.jsx: fetchWithdrawalHistory error:", err);
      toast.error("Failed to fetch withdrawal history");
      return [];
    }
  };

  // Fetch stakes
  const fetchStakes = async (accountAddress, count) => {
    if (!accountAddress || !count || count === 0) return [];
    if (!ethers.isAddress(accountAddress)) {
      console.error("Referrals.jsx: Invalid account address:", accountAddress);
      throw new Error("Invalid account address");
    }
    const contract = new ethers.Contract(
      VITE_STAKING_ADDRESS,
      StakingContractABI,
      provider
    );
    const stakesData = [];
    try {
      for (let i = 0; i < count; i++) {
        const stake = await withRetry(() => contract.stakes(accountAddress, i));
        const amount = BigInt(stake.amount);
        const startTimestamp = BigInt(stake.startTimestamp);
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const isActive =
          currentTime < startTimestamp + BigInt(5 * DAY_IN_SECONDS);
        stakesData.push({ id: i, amount, isActive });
      }
    } catch (err) {
      console.error("Referrals.jsx: fetchStakes error:", err);
      throw new Error(`Failed to fetch stakes: ${err.message}`);
    }
    return stakesData;
  };

  // Update data
  const updateData = async () => {
    try {
      if (account?.address && ethers.isAddress(account.address)) {
        if (referralBonusData && !isReferralBonusLoading) {
          const bonus = BigInt(referralBonusData);
          console.log(
            "Referral Bonus for",
            account.address,
            ":",
            ethers.formatUnits(bonus, USDT_DECIMALS),
            "USDT"
          );
          setReferralBonus(bonus);
        }
        if (stakeCountData && !isStakeCountLoading) {
          const count = Number(stakeCountData);
          if (count > Number.MAX_SAFE_INTEGER) {
            throw new Error("Stake count exceeds safe integer limit");
          }
          const stakesData = await fetchStakes(account.address, count);
          setStakes(stakesData);
        }
        const referralsData = await fetchReferrals(account.address);
        setReferrals(referralsData);
        const withdrawalHistoryData = await fetchWithdrawalHistory(
          account.address
        );
        setWithdrawalHistory(withdrawalHistoryData);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Referrals.jsx: updateData error:", err);
      setError(err);
      setIsLoading(false);
    }
  };

  const debouncedUpdateData = debounce(updateData, 1000);

  // Data fetching and error handling
  useEffect(() => {
    ReactModal.setAppElement("#root");
    debouncedUpdateData();
    const interval = setInterval(debouncedUpdateData, 30000);
    console.log("Started data update interval");
    return () => {
      console.log("Clearing data update interval");
      clearInterval(interval);
      debouncedUpdateData.cancel();
    };
  }, [
    account,
    referralBonusData,
    stakeCountData,
    isReferralBonusLoading,
    isStakeCountLoading,
    refreshTrigger,
  ]);

  // Handle errors
  useEffect(() => {
    if (referralBonusError) {
      console.error("Referrals.jsx: referralBonusError:", referralBonusError);
      toast.error(
        `Failed to fetch referral bonus: ${referralBonusError.message}`
      );
      setError(referralBonusError);
    }
    if (stakeCountError) {
      console.error("Referrals.jsx: stakeCountError:", stakeCountError);
      toast.error(`Failed to fetch stake count: ${stakeCountError.message}`);
      setError(stakeCountError);
    }
    if (stakingNonceError) {
      console.error("Referrals.jsx: stakingNonceError:", stakingNonceError);
      toast.error(`Failed to fetch nonce: ${stakingNonceError.message}`);
      setError(stakingNonceError);
    }
    if (usdtBalanceError) {
      console.error("Referrals.jsx: usdtBalanceError:", usdtBalanceError);
      toast.error(`Failed to fetch USDT balance: ${usdtBalanceError.message}`);
      setError(usdtBalanceError);
    }
  }, [
    referralBonusError,
    stakeCountError,
    stakingNonceError,
    usdtBalanceError,
  ]);

  // Copy referral link
  const handleCopyReferralLink = async () => {
    try {
      const link = `${window.location.origin}/dashboard/staking?ref=${
        account?.address || "0x0"
      }`;
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!", { position: "top-right" });
    } catch (err) {
      console.error("Referrals.jsx: handleCopyReferralLink error:", err);
      toast.error("Failed to copy link", { position: "top-right" });
    }
  };

  // Gasless transaction handler
  const handleGaslessTransaction = async ({
    functionName,
    primaryType,
    nonce,
    deadline,
  }) => {
    if (!account || !wallet) {
      throw new Error("Please connect your wallet");
    }
    const domain = {
      name: "StakingContract",
      version: "1",
      chainId: chainId,
      verifyingContract: VITE_STAKING_ADDRESS,
    };
    const types = {
      WithdrawReferralBonus: [
        { name: "user", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      user: account.address,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };
    console.log("EIP-712 Payload:", { domain, types, primaryType, message });
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
    const args = [message.user, message.deadline];
    console.log("Relayer Request:", {
      contractAddress: VITE_STAKING_ADDRESS,
      functionName,
      args,
      userAddress: account.address,
      signature,
    });
    const retryFetch = async (url, options, retries = 3, delay = 200) => {
      let lastError = null;
      for (let i = 1; i <= retries; i++) {
        try {
          console.log(`Relayer Attempt ${i}: Sending request to ${url}`);
          const response = await fetch(url, options);
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
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };
    try {
      const result = await retryFetch(VITE_RELAYER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: VITE_STAKING_ADDRESS,
          functionName,
          args,
          userAddress: account.address,
          signature,
        }),
      });
      if (result.txHash) {
        const txConfirmed = await checkTransactionStatus(result.txHash);
        if (!txConfirmed) {
          throw new Error("Transaction failed to confirm on-chain");
        }
      } else if (!result.success) {
        throw new Error("Relayer did not confirm success");
      }
      return { signature, txHash: result.txHash, success: result.success };
    } catch (err) {
      console.error("Relayer Communication Failed:", err);
      throw err;
    } finally {
      setPendingTx(null);
    }
  };

  // Handle gasless withdrawal
  const handleWithdraw = async () => {
    if (
      !wallet ||
      !account ||
      !account.address ||
      !ethers.isAddress(account.address)
    ) {
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }
    if (referralBonus < MIN_REFERRAL_WITHDRAWAL) {
      toast.error("Minimum 5 USDT required to withdraw");
      return;
    }
    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }
    setIsWithdrawLoading(true);
    const toastId = toast.loading("Withdrawing referral bonus...");
    try {
      if (!stakingNonceData) {
        throw new Error("Failed to fetch nonce data");
      }
      const nonce = BigInt(stakingNonceData);
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
      console.log(
        "Withdraw Referral Bonus Nonce:",
        nonce.toString(),
        "Deadline:",
        deadline
      );
      const result = await handleGaslessTransaction({
        functionName: "executeMetaWithdrawReferralBonus",
        primaryType: "WithdrawReferralBonus",
        nonce,
        deadline,
      });
      if (result.txHash) {
        await checkTransactionStatus(result.txHash);
      }
      console.log("Withdraw Referral Bonus Transaction Hash:", result.txHash);
      toast.success(
        `Withdrawn ${formatUSDT(referralBonus)} USDT successfully`,
        { id: toastId }
      );
      await Promise.all([
        refetchReferralBonus(),
        refetchStakingNonce(),
        refetchUsdtBalance(),
        refetchStakeCount(),
      ]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Withdraw Referral Bonus Error:", err);
      let errorMessage = "Failed to withdraw referral bonus.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage = `Cannot connect to relayer at ${VITE_RELAYER_URL}. Please ensure the relayer is running.`;
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("nonce")) {
        errorMessage = "Failed to fetch nonce. Please try again.";
      }
      toast.error(errorMessage, { id: toastId });
      await refetchStakingNonce();
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  // Progress bar
  const referralProgress = Math.min(
    (Number(ethers.formatUnits(referralBonus, USDT_DECIMALS)) /
      Number(ethers.formatUnits(MIN_REFERRAL_WITHDRAWAL, USDT_DECIMALS))) *
      100,
    100
  );

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (
    isLoading ||
    isReferralBonusLoading ||
    isStakeCountLoading ||
    isStakingNonceLoading ||
    isUsdtBalanceLoading
  ) {
    return (
      <div className="flex items-center justify-center bg-slate-900 p-4 w-full min-w-0">
        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 py-8 bg-slate-900 min-w-0">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-200 mb-6 sm:mb-8 font-geist"
      >
        Referrals
      </motion.h2>

      <button
        onClick={() => setRefreshTrigger((prev) => prev + 1)}
        className="mb-3 sm:mb-4 px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 flex items-center text-xs sm:text-sm w-full sm:w-auto"
      >
        <RefreshCw className="w-3 sm:w-4 h-3 sm:h-4 mr-2" />
        Refresh Data
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 w-full">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(0)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Your Referral Link
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0 space-y-3 flex-1">
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono truncate">
              {`${window.location.origin}/dashboard/staking?ref=${
                account?.address || "0x0"
              }`}
            </p>
            <button
              onClick={handleCopyReferralLink}
              className="group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
              data-tooltip-id="copy-tooltip"
              data-tooltip-content="Copy your referral link"
            >
              <Copy className="w-3 sm:w-4 h-3 sm:h-4 mr-2" />
              Copy
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(1)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Referral Progress
          </h3>
          <div className="w-full bg-slate-800 rounded-full h-3 sm:h-4 mb-3 sm:mb-4">
            <motion.div
              className="bg-cyan-600 h-3 sm:h-4 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${referralProgress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
            {formatUSDT(referralBonus)} / {formatUSDT(MIN_REFERRAL_WITHDRAWAL)}{" "}
            USDT to withdraw
          </p>
          <button
            onClick={handleWithdraw}
            disabled={
              isWithdrawLoading || referralBonus < MIN_REFERRAL_WITHDRAWAL
            }
            className={`group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm mt-3 sm:mt-4 ${
              isWithdrawLoading || referralBonus < MIN_REFERRAL_WITHDRAWAL
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            data-tooltip-id="withdraw-tooltip"
            data-tooltip-content="Withdraw referral bonus (min 5 USDT)"
          >
            Withdraw Bonus
            <ArrowRight className="ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(2)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Total Staked
          </h3>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <DollarSign className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-xs sm:text-sm font-geist-mono">
                Staked Amount
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white font-geist">
                $
                {formatUSDT(
                  stakes.reduce((sum, stake) => sum + stake.amount, 0n)
                )}
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-geist-mono">
            Manage your stakes in the{" "}
            <NavLink to="/dashboard/rewards" className="text-cyan-600 hover:underline">
              Rewards
            </NavLink>{" "}
            section to unstake or compound rewards.
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(3)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full flex flex-col"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
            Referral Count
          </h3>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-white font-geist">
            {referrals.length} Referrals
          </p>
          <p className="text-slate-400 text-xs sm:text-sm font-geist-mono">
            Earn {formatUSDT(REFERRAL_BONUS)} USDT per referral who stakes.
          </p>
        </motion.div>
      </div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(4)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 w-full flex flex-col"
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
          Referral History
        </h3>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-cyan-700/30">
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Referee Address
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[100px]">
                  Date
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[80px]">
                  Bonus (USDT)
                </th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral, index) => (
                <tr key={index} className="border-b border-cyan-700/30">
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    <button
                      onClick={() => setSelectedReferral(referral)}
                      className="text-cyan-600 hover:underline text-xs sm:text-sm"
                      data-tooltip-id={`referral-tooltip-${index}`}
                      data-tooltip-content="View referee details"
                    >
                      {referral.address}
                    </button>
                    <Tooltip
                      id={`referral-tooltip-${index}`}
                      place="top"
                      className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
                      style={{ fontFamily: "Geist Mono" }}
                    />
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {referral.timestamp}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {formatUSDT(referral.bonus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrals.length === 0 && (
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            No referrals yet. Share your link to earn{" "}
            {formatUSDT(REFERRAL_BONUS)} USDT per referral!
          </p>
        )}
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(5)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 w-full flex flex-col"
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-3 sm:mb-4 font-geist">
          Withdrawal History
        </h3>
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-cyan-700/30">
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Amount (USDT)
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[100px]">
                  Date
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[80px]">
                  Tx Hash
                </th>
              </tr>
            </thead>
            <tbody>
              {withdrawalHistory.map((withdrawal, index) => (
                <tr key={index} className="border-b border-cyan-700/30">
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {formatUSDT(withdrawal.amount)}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    {withdrawal.timestamp}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                    <span
                      className="text-cyan-600 cursor-pointer hover:underline text-xs sm:text-sm"
                      title={withdrawal.txHash}
                      onClick={() => {
                        navigator.clipboard.writeText(withdrawal.txHash);
                        toast.success("Transaction hash copied!");
                      }}
                    >
                      {`${withdrawal.txHash.slice(
                        0,
                        6
                      )}...${withdrawal.txHash.slice(-4)}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {withdrawalHistory.length === 0 && (
          <p className="text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4 font-geist-mono">
            No withdrawals recorded.
          </p>
        )}
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(6)}
        className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 w-full"
      >
        <NavLink
          to="/dashboard"
          className="group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
        >
          Back to Overview
          <ArrowRight className="ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </NavLink>
        <NavLink
          to="/dashboard/staking"
          className="group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
        >
          Manage Stakes
          <ArrowRight className="ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </NavLink>
      </motion.div>

      <ReactModal
        isOpen={!!selectedReferral}
        onRequestClose={() => setSelectedReferral(null)}
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
              Referee Details
            </h3>
            <button
              onClick={() => setSelectedReferral(null)}
              className="text-slate-400 hover:text-cyan-600"
              aria-label="Close modal"
            >
              <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
            </button>
          </div>
          {selectedReferral && (
            <div className="space-y-2 sm:space-y-3 text-slate-200 font-geist-mono text-xs sm:text-sm">
              <p>Referee Address: {selectedReferral.fullAddress}</p>
              <p>Date: {selectedReferral.timestamp}</p>
              <p>Bonus: {formatUSDT(selectedReferral.bonus)} USDT</p>
            </div>
          )}
        </motion.div>
      </ReactModal>

      <Tooltip
        id="copy-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
      <Tooltip
        id="withdraw-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
    </div>
  );
}
