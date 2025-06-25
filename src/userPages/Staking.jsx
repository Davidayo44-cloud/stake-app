import { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  sendTransaction,
  defineChain,
} from "thirdweb";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Copy, ArrowRight, X } from "lucide-react";
import ReactModal from "react-modal";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { USDTABI, StakingContractABI } from "../config/abis";

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});

// Define BSC Mainnet chain
const bscChain = defineChain({
  id: 56,
  rpc: import.meta.env.VITE_RPC_URL,
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
});

// Validate environment variables
const requiredEnvVars = {
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
  VITE_RELAYER_URL: import.meta.env.VITE_RELAYER_URL,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
  VITE_MIN_STAKE: import.meta.env.VITE_MIN_STAKE,
  VITE_MIN_REFERRAL_WITHDRAWAL: import.meta.env.VITE_MIN_REFERRAL_WITHDRAWAL,
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_COMPOUND_RATE: import.meta.env.VITE_PLAN_REWARD_RATE,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error("Staking.jsx: Missing environment variables:", missingEnvVars);
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

const {
  VITE_USDT_ADDRESS,
  VITE_STAKING_ADDRESS,
  VITE_RELAYER_URL,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_API_BASE_URL,
  VITE_USDT_DECIMALS,
  VITE_MIN_STAKE,
  VITE_MIN_REFERRAL_WITHDRAWAL,
  VITE_THIRDWEB_CLIENT_ID,
  VITE_COMPOUND_RATE,
} = requiredEnvVars;

// Validate USDT decimals
const usdtDecimals = parseInt(VITE_USDT_DECIMALS, 10);
if (isNaN(usdtDecimals) || usdtDecimals <= 0) {
  console.error("Staking.jsx: Invalid USDT decimals:", VITE_USDT_DECIMALS);
  throw new Error("Invalid USDT decimals");
}

// Validate minimum stake
const minStake = BigInt(VITE_MIN_STAKE);
if (minStake <= 0n) {
  console.error("Staking.jsx: Invalid minimum stake:", VITE_MIN_STAKE);
  throw new Error("Invalid minimum stake");
}

// Validate minimum referral withdrawal
const minReferralWithdrawal = BigInt(VITE_MIN_REFERRAL_WITHDRAWAL);
if (minReferralWithdrawal <= 0n) {
  console.error(
    "Staking.jsx: Invalid minimum referral withdrawal:",
    VITE_MIN_REFERRAL_WITHDRAWAL
  );
  throw new Error("Invalid minimum referral withdrawal");
}

// Validate compound rate
const compoundRate = parseInt(VITE_COMPOUND_RATE, 10);
if (isNaN(compoundRate) || compoundRate <= 0) {
  console.error("Staking.jsx: Invalid compound rate:", VITE_COMPOUND_RATE);
  throw new Error("Invalid compound rate");
}

// Validate contract addresses
if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "Staking.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "Staking.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("Staking.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}

// Utility to format USDT
const formatUSDT = (value) => {
  if (value === null || value === undefined || value < 0n) return "0.00";
  try {
    const formatted = ethers.formatUnits(BigInt(value), usdtDecimals);
    return Number(formatted).toFixed(2);
  } catch (err) {
    console.warn("formatUSDT error:", err.message, "Value:", value);
    return "0.00";
  }
};

// Utility to determine stake status
const getStakeStatus = (stake) => {
  if (stake.amountWei <= 0n) {
    return { label: "Unstaked", color: "bg-slate-600" };
  }
  const currentTime = Math.floor(Date.now() / 1000);
  const stakeEndTime = Number(stake.startTimestamp) + 5 * 86400;
  if (currentTime < stakeEndTime) {
    return { label: "Locked", color: "bg-cyan-600" };
  }
  return { label: "Completed", color: "bg-green-600" };
};

export default function Staking() {
  const account = useActiveAccount();
  const [amount, setAmount] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [referrer, setReferrer] = useState("");
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [isApproveAmountValid, setIsApproveAmountValid] = useState(true);
  const [isReferrerValid, setIsReferrerValid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pendingTx, setPendingTx] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState("0.00");
  const [usdtAllowance, setUsdtAllowance] = useState("0.00");
  const [stakeCount, setStakeCount] = useState("0");
  const [stakes, setStakes] = useState([]);
  const [selectedStake, setSelectedStake] = useState(null);
  const [isReferrerReadOnly, setIsReferrerReadOnly] = useState(false);
  const [referralBonus, setReferralBonus] = useState(0n);
  const [isSuspended, setIsSuspended] = useState({
    isSuspended: false,
    reason: null,
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Hardhat provider
  const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);

  // Contract instances
  const usdtContract = new ethers.Contract(
    VITE_USDT_ADDRESS,
    USDTABI,
    provider
  );
  const stakingContract = new ethers.Contract(
    VITE_STAKING_ADDRESS,
    StakingContractABI,
    provider
  );

  const handleContactAdmin = () => {
    window.open("https://t.me/stakerm", "_blank");
  };

  // Handle referral logic
  useEffect(() => {
    const refAddress = searchParams.get("ref");
    if (!account) {
      if (refAddress && ethers.isAddress(refAddress)) {
        localStorage.setItem("referrerAddress", refAddress);
        navigate("/");
      }
      return;
    }

    const storedReferrer = localStorage.getItem("referrerAddress");
    if (
      refAddress &&
      ethers.isAddress(refAddress) &&
      refAddress !== account.address
    ) {
      setReferrer(refAddress);
      setIsReferrerReadOnly(true);
      setIsReferrerValid(true);
      localStorage.removeItem("referrerAddress");
      navigate("/dashboard/staking");
    } else if (
      storedReferrer &&
      ethers.isAddress(storedReferrer) &&
      storedReferrer !== account.address
    ) {
      setReferrer(storedReferrer);
      setIsReferrerReadOnly(true);
      setIsReferrerValid(true);
      localStorage.removeItem("referrerAddress");
      navigate("/dashboard/staking");
    }
  }, [account, searchParams, navigate]);

  // Validate amounts and referrer
  useEffect(() => {
    const amountNum = Number(amount);
    const approveAmountNum = Number(approveAmount);
    const minStakeUSDT = Number(ethers.formatUnits(minStake, usdtDecimals));
    setIsAmountValid(amountNum >= minStakeUSDT || amount === "");
    setIsApproveAmountValid(approveAmountNum > 0 || approveAmount === "");

    if (referrer && account?.address) {
      setIsReferrerValid(
        ethers.isAddress(referrer) &&
          referrer.toLowerCase() !== account.address.toLowerCase()
      );
    } else {
      setIsReferrerValid(true);
    }
  }, [amount, approveAmount, referrer, account]);

  // Retry wrapper for RPC calls
  const withRetry = async (fn, retries = 3, delay = 200) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        console.error(`Retry attempt ${i + 1} failed:`, {
          message: err.message,
          stack: err.stack,
        });
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Check suspension status
  const checkSuspensionStatus = async (userAddress) => {
    if (!ethers.isAddress(userAddress)) {
      console.error("Staking.jsx: Invalid user address:", userAddress);
      return { isSuspended: false, reason: null };
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

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
          console.error("Staking.jsx: Suspension check error", {
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
        console.log("Staking.jsx: Suspension status fetched", data);
        return data; // { isSuspended: boolean, reason: string, suspendedAt: Date }
      } catch (err) {
        console.error("Staking.jsx: Failed to check suspension status:", {
          message: err.message,
          stack: err.stack,
          attempt,
        });

        if (attempt === maxRetries) {
          console.warn("Staking.jsx: Max retries reached for suspension check");
          return { isSuspended: false, reason: null }; // Default to not suspended
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  };

  // Contract and user state checks
  const checkContractState = async () => {
    return withRetry(async () => {
      const paused = await stakingContract.paused();
      const rewardPoolBalance = await stakingContract.rewardPoolBalance();
      return { paused, rewardPoolBalance };
    });
  };

  const checkUserBalances = async (userAddress, amountBigInt) => {
    return withRetry(async () => {
      const balance = await usdtContract.balanceOf(userAddress);
      const allowance = await usdtContract.allowance(
        userAddress,
        VITE_STAKING_ADDRESS
      );
      const bnbBalance = await provider.getBalance(userAddress);
      return { balance, allowance, bnbBalance };
    });
  };

  const checkAllowance = async (amountBigInt) => {
    return withRetry(async () => {
      if (!account?.address) {
        throw new Error("No account connected");
      }
      const allowance = await usdtContract.allowance(
        account.address,
        VITE_STAKING_ADDRESS
      );
      return allowance >= amountBigInt;
    });
  };

  const checkStakeSuccess = async (
    userAddress,
    amountBigInt,
    prevStakeCount
  ) => {
    try {
      const stakeCount = await stakingContract.getUserStakeCount(userAddress);
      if (Number(stakeCount) > Number(prevStakeCount)) {
        const newStake = await stakingContract.stakes(
          userAddress,
          Number(stakeCount) - 1
        );
        const stakeAmount = BigInt(newStake.amount.toString());
        if (stakeAmount === amountBigInt) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Error checking stake success:", {
        message: err.message,
        stack: err.stack,
      });
      return false;
    }
  };

  const checkUnstakeSuccess = async (
    userAddress,
    stakeIndex,
    amountBigInt,
    prevStake
  ) => {
    try {
      const stake = await stakingContract.stakes(userAddress, stakeIndex);
      const currentAmount = BigInt(stake.amount.toString());
      const prevAmount = BigInt(prevStake.amount.toString());
      if (currentAmount < prevAmount) {
        const withdrawn = prevAmount - currentAmount;
        return withdrawn >= amountBigInt;
      }
      return false;
    } catch (err) {
      console.error("Error checking unstake success:", {
        message: err.message,
        stack: err.stack,
      });
      return false;
    }
  };

  const checkCompoundSuccess = async (userAddress, stakeIndex, prevStake) => {
    try {
      const stake = await stakingContract.stakes(userAddress, stakeIndex);
      const currentAmount = BigInt(stake.amount.toString());
      const prevAmount = BigInt(prevStake.amount.toString());
      return currentAmount > prevAmount;
    } catch (err) {
      console.error("Error checking compound success:", {
        message: err.message,
        stack: err.stack,
      });
      return false;
    }
  };

  const fetchStakes = useCallback(
    async (accountAddress, count) => {
      if (!accountAddress || !count || count === 0) {
        return [];
      }
      if (!ethers.isAddress(accountAddress)) {
        throw new Error("Invalid account address");
      }

      const stakesData = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          for (let i = 0; i < count; i++) {
            const [stake, totalRewards] = await Promise.all([
              stakingContract.stakes(accountAddress, i),
              stakingContract.getUserTotalRewards(accountAddress, i),
            ]);

            const amountWei = BigInt(stake.amount);
            const amount = Number(ethers.formatUnits(amountWei, usdtDecimals));
            const accruedRewardWei = BigInt(stake.accruedReward);
            const accruedReward = Number(
              ethers.formatUnits(accruedRewardWei, usdtDecimals)
            );
            const startTimestamp = BigInt(stake.startTimestamp);
            const totalRewardsWei = BigInt(totalRewards);
            const pendingRewardWei = totalRewardsWei - accruedRewardWei;
            const pendingReward = Number(
              ethers.formatUnits(pendingRewardWei, usdtDecimals)
            ).toFixed(usdtDecimals);
            const currentTime = Math.floor(Date.now() / 1000);
            const stakeEndTime = Number(startTimestamp) + 5 * 86400;
            const isActive = currentTime < stakeEndTime;

            stakesData.push({
              id: i,
              amount,
              amountWei,
              startTimestamp,
              accruedReward,
              accruedRewardWei,
              pendingReward: Number(pendingReward),
              pendingRewardWei,
              isActive,
            });
          }
          return stakesData;
        } catch (err) {
          if (attempt === 3) {
            throw new Error(
              `Failed to fetch stakes after ${attempt} attempts: ${err.message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    },
    [stakingContract]
  );

  // Update state
  const updateState = async () => {
    if (account?.address && ethers.isAddress(account.address)) {
      try {
        const [balance, allowance, count, referralBonus, suspensionStatus] =
          await Promise.all([
            withRetry(() => usdtContract.balanceOf(account.address)),
            withRetry(() =>
              usdtContract.allowance(account.address, VITE_STAKING_ADDRESS)
            ),
            withRetry(() => stakingContract.getUserStakeCount(account.address)),
            withRetry(() =>
              stakingContract.getUserReferralBonus(account.address)
            ),
            checkSuspensionStatus(account.address),
          ]);
        setUsdtBalance(formatUSDT(balance));
        setUsdtAllowance(formatUSDT(allowance));
        setStakeCount(count.toString());
        setReferralBonus(referralBonus);
        setIsSuspended(suspensionStatus);

        const stakesData = await fetchStakes(account.address, parseInt(count));
        setStakes(stakesData);
      } catch (err) {
        console.error("Failed to update state:", {
          message: err.message,
          stack: err.stack,
        });
        toast.error(`Failed to fetch data: ${err.message}`);
      }
    } else {
      setUsdtBalance("0.00");
      setUsdtAllowance("0.00");
      setStakes([]);
      setReferralBonus(0n);
      setIsSuspended({ isSuspended: false, reason: null });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    updateState();
    const intervalId = setInterval(updateState, 60000);
    return () => clearInterval(intervalId);
  }, [account]);

  // Set modal app element
  useEffect(() => {
    try {
      ReactModal.setAppElement("#root");
    } catch (err) {
      console.warn("Failed to set ReactModal app element:", err.message);
    }
  }, []);

  const handleGaslessTransaction = async ({
    isApprove = false,
    functionName,
    primaryType,
    amountBigInt,
    nonce,
    deadline,
    stakeIndex = 0,
    early = false,
    referrer = "0x0000000000000000000000000000000000000000",
  }) => {
    if (!account) {
      throw new Error("Please connect your wallet");
    }
    if (isSuspended.isSuspended) {
      throw new Error("Your account is suspended");
    }

    if (isApprove) {
      try {
        const usdtContract = getContract({
          client,
          chain: bscChain,
          address: VITE_USDT_ADDRESS,
          abi: USDTABI,
        });

        const transactionObj = await prepareContractCall({
          contract: usdtContract,
          method:
            "function approve(address spender, uint256 amount) returns (bool)",
          params: [VITE_STAKING_ADDRESS, amountBigInt],
          gas: BigInt(100000),
        });

        let transactionResult;
        try {
          transactionResult = await sendTransaction({
            account,
            transaction: transactionObj,
          });
        } catch (signErr) {
          throw new Error(
            `Failed to sign approval transaction: ${signErr.message}`
          );
        }

        const receipt = await provider.waitForTransaction(
          transactionResult.transactionHash,
          1,
          60000
        );
        if (receipt.status !== 1) {
          throw new Error("Approval transaction failed to confirm on-chain");
        }

        return { txHash: transactionResult.transactionHash, success: true };
      } catch (err) {
        throw new Error(
          `Failed to execute approval transaction: ${err.message}`
        );
      }
    } else {
      const domain = {
        name: "StakingContract",
        version: "1",
        chainId: parseInt(VITE_CHAIN_ID, 10),
        verifyingContract: VITE_STAKING_ADDRESS,
      };

      const types =
        primaryType === "Stake"
          ? {
              Stake: [
                { name: "user", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "referrer", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            }
          : primaryType === "WithdrawReward"
          ? {
              WithdrawReward: [
                { name: "user", type: "address" },
                { name: "stakeIndex", type: "uint256" },
                { name: "amount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            }
          : primaryType === "Unstake"
          ? {
              Unstake: [
                { name: "user", type: "address" },
                { name: "stakeIndex", type: "uint256" },
                { name: "amount", type: "uint256" },
                { name: "early", type: "bool" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            }
          : primaryType === "Compound"
          ? {
              Compound: [
                { name: "user", type: "address" },
                { name: "stakeIndex", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            }
          : {
              WithdrawReferralBonus: [
                { name: "user", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            };

      const validReferrer = ethers.isAddress(referrer)
        ? referrer
        : "0x0000000000000000000000000000000000000000";

      const message =
        primaryType === "Stake"
          ? {
              user: account.address,
              amount: amountBigInt.toString(),
              referrer: validReferrer,
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            }
          : primaryType === "WithdrawReward"
          ? {
              user: account.address,
              stakeIndex: stakeIndex.toString(),
              amount: amountBigInt.toString(),
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            }
          : primaryType === "Unstake"
          ? {
              user: account.address,
              stakeIndex: stakeIndex.toString(),
              amount: amountBigInt.toString(),
              early,
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            }
          : primaryType === "Compound"
          ? {
              user: account.address,
              stakeIndex: stakeIndex.toString(),
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            }
          : {
              user: account.address,
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            };

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
        if (!signature.match(/^0x[a-fA-F0-9]{130}$/)) {
          throw new Error(`Invalid signature format: ${signature}`);
        }
      } catch (signErr) {
        throw new Error(`Failed to sign transaction: ${signErr.message}`);
      }

      const recovered = ethers.verifyTypedData(
        domain,
        types,
        message,
        signature
      );
      if (recovered.toLowerCase() !== account.address.toLowerCase()) {
        throw new Error(
          `Signature does not recover to user address: ${recovered}`
        );
      }

      const args =
        primaryType === "Stake"
          ? [message.user, message.amount, message.referrer, message.deadline]
          : primaryType === "WithdrawReward"
          ? [message.user, message.stakeIndex, message.amount, message.deadline]
          : primaryType === "Unstake"
          ? [
              message.user,
              message.stakeIndex,
              message.amount,
              message.early,
              message.deadline,
            ]
          : primaryType === "Compound"
          ? [message.user, message.stakeIndex, message.deadline]
          : [message.user, message.nonce, message.deadline];

      const sig = ethers.Signature.from(signature);
      const contractInterface = new ethers.Interface(StakingContractABI);
      const data = contractInterface.encodeFunctionData(functionName, [
        ...args,
        sig.v,
        sig.r,
        sig.s,
      ]);

      const transaction = {
        to: VITE_STAKING_ADDRESS,
        data,
        gasLimit: BigInt(200000),
      };

      const retryFetch = async (url, retries = 3, delay = 2000) => {
        const requestBody = {
          contractAddress: VITE_STAKING_ADDRESS,
          functionName,
          args: [...args, sig.v, sig.r, sig.s],
          userAddress: account.address,
          signature,
          chainId: parseInt(VITE_CHAIN_ID, 10),
          speed: "fast",
        };

        let lastError = null;
        for (let i = 1; i <= retries; i++) {
          try {
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
            setPendingTx(result.hash);
            return result;
          } catch (err) {
            lastError = err;
            if (i === retries) {
              if (pendingTx) {
                const receipt = await provider.getTransactionReceipt(pendingTx);
                if (receipt && receipt.status === 1) {
                  return { txHash: pendingTx, success: true };
                }
              }
              if (functionName === "executeMetaStake") {
                const prevStakeCount = await stakingContract.getUserStakeCount(
                  account.address
                );
                const stakeConfirmed = await checkStakeSuccess(
                  account.address,
                  amountBigInt,
                  prevStakeCount
                );
                if (stakeConfirmed) {
                  return { txHash: null, success: true };
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
        const result = await retryFetch(VITE_RELAYER_URL);
        if (result.hash) {
          const receipt = await provider.waitForTransaction(
            result.hash,
            1,
            60000
          );
          if (receipt.status !== 1) {
            try {
              const tx = await provider.getTransaction(result.hash);
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
        return { txHash: result.hash, success: true };
      } catch (err) {
        let errorMessage = "Failed to relay transaction.";
        if (err.message.includes("Relayer has insufficient funds")) {
          errorMessage =
            "Relayer out of funds. Please fund the Relayer address with BNB.";
        } else if (err.message.includes("Authentication failed")) {
          errorMessage =
            "Invalid Defender API credentials. Please contact the admin.";
        } else if (err.message.includes("Invalid transaction parameters")) {
          errorMessage = `Invalid transaction parameters: Check relayer funds, contract address, or gas limit.`;
        } else if (err.message.includes("args is not defined")) {
          errorMessage = "Invalid transaction parameters. Please try again.";
        } else {
          errorMessage = `Relay error: ${err.message}`;
        }
        throw new Error(errorMessage);
      } finally {
        setPendingTx(null);
      }
    }
  };

  const handleApprove = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }

    const approveAmountNum = Number(approveAmount);
    if (isNaN(approveAmountNum) || approveAmountNum <= 0) {
      toast.error("Please enter a valid approval amount");
      return;
    }

    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Approving USDT...");
    try {
      const amountBigInt = ethers.parseUnits(
        approveAmountNum.toString(),
        usdtDecimals
      );
      const { balance, bnbBalance } = await checkUserBalances(
        account.address,
        amountBigInt
      );
      if (balance < amountBigInt) {
        throw new Error(
          `Insufficient USDT balance: ${ethers.formatUnits(
            balance,
            usdtDecimals
          )} < ${ethers.formatUnits(amountBigInt, usdtDecimals)}`
        );
      }

      const minBnbRequired = ethers.parseEther("0.00015");
      if (bnbBalance < minBnbRequired) {
        throw new Error(
          `Insufficient BNB for gas fees: ${ethers.formatEther(
            bnbBalance
          )} < ${ethers.formatEther(
            minBnbRequired
          )}. Please add BNB to your wallet.`
        );
      }

      const approvalResult = await handleGaslessTransaction({
        isApprove: true,
        functionName: "approve",
        amountBigInt,
      });

      toast.success(`Successfully approved ${approveAmountNum} USDT!`, {
        id: toastId,
      });
      await updateState();
      setApproveAmount("");
    } catch (err) {
      console.error("Approval Transaction Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to approve USDT.";
      if (err.message.includes("insufficient funds for gas")) {
        errorMessage =
          "Insufficient BNB for gas fees. Please add at least 0.001 BNB to your wallet.";
      } else if (err.message.includes("USDT balance")) {
        errorMessage = "Insufficient USDT balance. Please acquire more USDT.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Approval failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStake = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }

    const amountNum = Number(amount);
    const minStakeUSDT = Number(ethers.formatUnits(minStake, usdtDecimals));
    if (isNaN(amountNum) || amountNum < minStakeUSDT) {
      toast.error(`Minimum stake is ${minStakeUSDT} USDT`);
      return;
    }

    if (referrer && !ethers.isAddress(referrer)) {
      toast.error(
        "Invalid referrer address. Please enter a valid address or leave blank."
      );
      return;
    }
    if (referrer && referrer.toLowerCase() === account.address.toLowerCase()) {
      toast.error("Self-referral not allowed");
      return;
    }

    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Processing stake...");
    try {
      const amountBigInt = ethers.parseUnits(
        amountNum.toString(),
        usdtDecimals
      );
      const { paused, rewardPoolBalance } = await checkContractState();
      if (paused) {
        throw new Error("Contract is paused");
      }
      const requiredReward =
        (amountBigInt * BigInt(compoundRate)) / BigInt(100);
      if (rewardPoolBalance < requiredReward) {
        throw new Error(
          `Insufficient reward pool balance: ${ethers.formatUnits(
            rewardPoolBalance,
            usdtDecimals
          )} < ${ethers.formatUnits(requiredReward, usdtDecimals)}`
        );
      }

      const { balance, bnbBalance } = await checkUserBalances(
        account.address,
        amountBigInt
      );
      if (balance < amountBigInt) {
        throw new Error(
          `Insufficient USDT balance: ${ethers.formatUnits(
            balance,
            usdtDecimals
          )} < ${ethers.formatUnits(amountBigInt, usdtDecimals)}`
        );
      }

      const minBnbRequired = ethers.parseEther("0.00001");
      if (bnbBalance < minBnbRequired) {
        throw new Error(
          `Insufficient BNB for gas fees: ${ethers.formatEther(
            bnbBalance
          )} < ${ethers.formatEther(
            minBnbRequired
          )}. Please add BNB to your wallet.`
        );
      }

      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const prevStakeCount = await stakingContract.getUserStakeCount(
        account.address
      );
      const stakeDeadline = Math.floor(Date.now() / 1000) + 60 * 60;

      const validReferrer =
        referrer && ethers.isAddress(referrer)
          ? referrer
          : "0x0000000000000000000000000000000000000000";

      const stakeResult = await handleGaslessTransaction({
        isApprove: false,
        functionName: "executeMetaStake",
        primaryType: "Stake",
        amountBigInt,
        nonce,
        deadline: stakeDeadline,
        referrer: validReferrer,
      });

      const stakeConfirmed = await checkStakeSuccess(
        account.address,
        amountBigInt,
        prevStakeCount
      );
      if (!stakeConfirmed && !stakeResult.txHash) {
        throw new Error(
          "Stake not confirmed on contract and no txHash provided"
        );
      }

      toast.success(`Successfully staked ${amountNum} USDT!`, { id: toastId });
      await updateState();
      setAmount("");
      setReferrer(isReferrerReadOnly ? validReferrer : "");
    } catch (err) {
      console.error("Stake Transaction Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to complete transaction.";
      if (err.message.includes("insufficient funds for gas")) {
        errorMessage =
          "Insufficient BNB for gas fees. Please add at least 0.001 BNB to your wallet.";
      } else if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("paused")) {
        errorMessage = "Staking contract is paused. Please contact the admin.";
      } else if (err.message.includes("reward pool")) {
        errorMessage =
          "Insufficient reward pool balance. Please contact the admin.";
      } else if (err.message.includes("USDT balance")) {
        errorMessage = "Insufficient USDT balance. Please acquire more USDT.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Relayer out of funds")) {
        errorMessage = "Relayer out of funds. Please contact the admin.";
      } else if (err.message.includes("Transaction deadline")) {
        errorMessage = "Transaction expired. Please try again.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Transaction failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWithdrawReward = async (stakeIndex, totalReward) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }
    if (totalReward <= 0) {
      toast.error("No rewards to withdraw");
      return;
    }
    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Withdrawing rewards...");
    try {
      const amountBigInt = ethers.parseUnits(
        totalReward.toString(),
        usdtDecimals
      );
      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

      const result = await handleGaslessTransaction({
        isApprove: false,
        functionName: "executeMetaWithdrawReward",
        primaryType: "WithdrawReward",
        amountBigInt,
        nonce,
        deadline,
        stakeIndex,
      });

      toast.success(
        `Successfully withdrew ${formatUSDT(amountBigInt)} USDT rewards!`,
        { id: toastId }
      );
      await updateState();
      setSelectedStake(null);
    } catch (err) {
      console.error("Withdraw Reward Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to withdraw rewards.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Withdraw failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnstake = async (stakeIndex, amount) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }
    if (amount <= 0) {
      toast.error("No funds available to unstake");
      return;
    }
    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Processing unstake...");
    try {
      const amountBigInt = ethers.parseUnits(amount.toString(), usdtDecimals);
      const { paused, rewardPoolBalance } = await checkContractState();
      if (paused) {
        throw new Error("Contract is paused");
      }

      const stake = stakes.find((s) => s.id === stakeIndex);
      if (!stake) {
        throw new Error("Invalid stake index");
      }
      if (stake.amountWei <= 0n) {
        throw new Error("No funds available to unstake");
      }
      const isEarly = stake.isActive;
      const effectiveReward = isEarly
        ? stake.pendingReward / 2
        : stake.pendingReward;
      const totalWithdrawable = ethers.parseUnits(
        (stake.amount + effectiveReward).toString(),
        usdtDecimals
      );
      if (amountBigInt > totalWithdrawable) {
        throw new Error(
          `Insufficient withdrawable funds: ${ethers.formatUnits(
            amountBigInt,
            usdtDecimals
          )} > ${ethers.formatUnits(totalWithdrawable, usdtDecimals)}`
        );
      }
      if (
        amountBigInt >
        rewardPoolBalance +
          ethers.parseUnits(stake.amount.toString(), usdtDecimals)
      ) {
        throw new Error(
          `Insufficient contract balance: ${ethers.formatUnits(
            amountBigInt,
            usdtDecimals
          )} > ${ethers.formatUnits(
            rewardPoolBalance +
              ethers.parseUnits(stake.amount.toString(), usdtDecimals),
            usdtDecimals
          )}`
        );
      }

      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const prevStake = await stakingContract.stakes(
        account.address,
        stakeIndex
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

      const result = await handleGaslessTransaction({
        isApprove: false,
        functionName: "executeMetaUnstake",
        primaryType: "Unstake",
        amountBigInt,
        nonce,
        deadline,
        stakeIndex,
        early: isEarly,
      });

      const unstakeConfirmed = await checkUnstakeSuccess(
        account.address,
        stakeIndex,
        amountBigInt,
        prevStake
      );
      if (!unstakeConfirmed && !result.txHash) {
        throw new Error(
          "Unstake not confirmed on contract and no txHash provided"
        );
      }

      toast.success(`Successfully unstaked ${formatUSDT(amountBigInt)} USDT!`, {
        id: toastId,
      });
      await updateState();
      setSelectedStake(null);
    } catch (err) {
      console.error("Unstake Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to unstake.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Staking period not ended")) {
        errorMessage = "Stake is still locked and early unstaking not allowed.";
      } else if (err.message.includes("Insufficient withdrawable funds")) {
        errorMessage = "Insufficient funds to unstake.";
      } else if (err.message.includes("No funds available")) {
        errorMessage = "No funds available to unstake.";
      } else if (err.message.includes("Invalid stake index")) {
        errorMessage = "Invalid stake index.";
      } else if (err.message.includes("Contract is paused")) {
        errorMessage = "Staking contract is paused. Please contact the admin.";
      } else if (err.message.includes("Insufficient contract balance")) {
        errorMessage =
          "Insufficient contract balance. Please contact the admin.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Unstake failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompound = async (stakeIndex) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }
    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Processing compound...");
    try {
      const { paused, rewardPoolBalance } = await checkContractState();
      if (paused) {
        throw new Error("Contract is paused");
      }

      const stake = stakes.find((s) => s.id === stakeIndex);
      if (!stake) {
        throw new Error("Invalid stake index");
      }
      const amountBigInt = ethers.parseUnits(
        stake.pendingReward.toString(),
        usdtDecimals
      );
      if (amountBigInt < minStake) {
        throw new Error(
          `Pending rewards too low: ${ethers.formatUnits(
            amountBigInt,
            usdtDecimals
          )} < ${ethers.formatUnits(minStake, usdtDecimals)}`
        );
      }
      if (amountBigInt > rewardPoolBalance) {
        throw new Error(
          `Insufficient reward pool balance: ${ethers.formatUnits(
            rewardPoolBalance,
            usdtDecimals
          )} < ${ethers.formatUnits(amountBigInt, usdtDecimals)}`
        );
      }

      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const prevStake = await stakingContract.stakes(
        account.address,
        stakeIndex
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

      const result = await handleGaslessTransaction({
        isApprove: false,
        functionName: "executeMetaCompound",
        primaryType: "Compound",
        nonce,
        deadline,
        stakeIndex,
      });

      const compoundConfirmed = await checkCompoundSuccess(
        account.address,
        stakeIndex,
        prevStake
      );
      if (!compoundConfirmed && !result.txHash) {
        throw new Error(
          "Compound not confirmed on contract and no txHash provided"
        );
      }

      toast.success("Successfully compounded rewards!", { id: toastId });
      await updateState();
      setSelectedStake(null);
    } catch (err) {
      console.error("Compound Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to compound rewards.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("Invalid stake index")) {
        errorMessage = "Invalid stake index.";
      } else if (err.message.includes("Pending rewards too low")) {
        errorMessage = "Pending rewards too low to compound.";
      } else if (err.message.includes("Contract is paused")) {
        errorMessage = "Staking contract is paused. Please contact the admin.";
      } else if (err.message.includes("Insufficient reward pool balance")) {
        errorMessage =
          "Insufficient reward pool balance. Please contact the admin.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Compound failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWithdrawReferralBonus = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSuspended.isSuspended) {
      toast.error("Your account is suspended");
      return;
    }
    if (referralBonus < minReferralWithdrawal) {
      toast.error(
        `Minimum ${ethers.formatUnits(
          minReferralWithdrawal,
          usdtDecimals
        )} USDT required to withdraw`
      );
      return;
    }
    if (pendingTx) {
      toast.error("A transaction is already pending. Please wait.");
      return;
    }

    setIsActionLoading(true);
    const toastId = toast.loading("Withdrawing referral bonus...");
    try {
      const nonce = await withRetry(() =>
        stakingContract.nonces(account.address)
      );
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

      const result = await handleGaslessTransaction({
        isApprove: false,
        functionName: "executeMetaWithdrawReferralBonus",
        primaryType: "WithdrawReferralBonus",
        nonce,
        deadline,
      });

      toast.success(
        `Successfully withdrew ${formatUSDT(referralBonus)} USDT!`,
        { id: toastId }
      );
      await updateState();
    } catch (err) {
      console.error("Withdraw Referral Bonus Error:", {
        message: err.message,
        stack: err.stack,
      });
      let errorMessage = "Failed to withdraw referral bonus.";
      if (err.message.includes("Relayer communication failed")) {
        errorMessage =
          "Cannot connect to relayer. Please ensure the relayer is running.";
      } else if (err.message.includes("wallet")) {
        errorMessage = "Wallet not connected. Please reconnect.";
      } else if (err.message.includes("Invalid signature")) {
        errorMessage = "Invalid signature. Please try again.";
      } else if (err.message.includes("account is suspended")) {
        errorMessage = "Your account is suspended";
      } else {
        errorMessage = `Withdraw failed: ${err.message}`;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCopyReferralLink = async () => {
    try {
      const link = `${window.location.origin}/dashboard/staking?ref=${
        account?.address || "0x0"
      }`;
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!", { position: "top-right" });
    } catch (err) {
      toast.error("Failed to copy link", { position: "top-right" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-slate-900 p-4 w-full min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-cyan-600"></div>
      </div>
    );
  }

  const isStakeButtonDisabled =
    isActionLoading ||
    !account ||
    !isAmountValid ||
    !isReferrerValid ||
    Number(usdtAllowance) === 0 ||
    Number(usdtAllowance) <
      Number(ethers.formatUnits(minStake, usdtDecimals)) ||
    isSuspended.isSuspended;

  return (
    <div className="mx-auto max-w-[95vw] sm:max-w-3xl md:max-w-5xl lg:max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 w-full bg-slate-900">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-200 mb-4 sm:mb-6 md:mb-8 font-geist"
      >
        Staking
      </motion.h2>

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5 }}
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-4 sm:mb-6 md:mb-8 w-full"
        data-tooltip-id="usdt-balance-tooltip"
        data-tooltip-content="Your current USDT balance and allowance in your wallet"
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-2 sm:mb-4 font-geist">
          Wallet Info
        </h3>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white font-geist">
          Balance: {usdtBalance} USDT
        </p>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white font-geist">
          Allowance: {usdtAllowance} USDT
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-2 sm:mb-4 font-geist">
            Approve & Stake USDT
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm text-slate-400 font-geist-mono mb-1">
                Approval Amount (USDT)
              </label>
              <input
                type="number"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="Enter amount to approve"
                className={`w-full px-2 sm:px-3 py-4 sm:py-4 bg-slate-800 border ${
                  isApproveAmountValid ? "border-cyan-600" : "border-red-500"
                } rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-xs sm:text-sm font-geist-mono`}
              />
              {!isApproveAmountValid && (
                <p className="text-red-500 text-xs mt-1 font-geist-mono">
                  Please enter a valid amount
                </p>
              )}
         
            </div>
            <button
              onClick={handleContactAdmin}
              disabled={isActionLoading || !account || isSuspended.isSuspended}
              className={`group w-full flex items-center justify-center px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                isActionLoading || !account || isSuspended.isSuspended
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Contact Admin for Approval
              <MessageSquare className="ml-1 sm:ml-2 w-3 sm:w-4 h-5 sm:h-5 transform group-hover:scale-110 transition-transform duration-300" />
            </button>
            <button
              onClick={handleApprove}
              disabled={
                isActionLoading ||
                !account ||
                !isApproveAmountValid ||
                isSuspended.isSuspended
              }
              className={`group w-full flex items-center justify-center px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                isActionLoading ||
                !account ||
                !isApproveAmountValid ||
                isSuspended.isSuspended
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Approve
              <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-5 sm:h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <div>
              <label className="block text-xs sm:text-sm text-slate-400 font-geist-mono mb-1">
                Stake Amount (USDT)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to stake"
                className={`w-full px-2 sm:px-3 py-4 sm:py-4 bg-slate-800 border ${
                  isAmountValid ? "border-cyan-600" : "border-red-500"
                } rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-xs sm:text-sm font-geist-mono`}
              />
              {!isAmountValid && (
                <p className="text-red-500 text-xs mt-1 font-geist-mono">
                  Minimum stake is {ethers.formatUnits(minStake, usdtDecimals)}{" "}
                  USDT
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-slate-400 font-geist-mono mb-1">
                Referrer Address (Optional)
              </label>
              <input
                type="text"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                placeholder="Enter referrer address"
                readOnly={isReferrerReadOnly}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 border ${
                  isReferrerValid ? "border-cyan-600" : "border-red-500"
                } rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-xs sm:text-sm font-geist-mono ${
                  isReferrerReadOnly ? "cursor-not-allowed" : ""
                }`}
              />
              {!isReferrerValid && (
                <p className="text-red-500 text-xs mt-1 font-geist-mono">
                  Invalid address or self-referral not allowed
                </p>
              )}
            </div>
            <button
              onClick={handleStake}
              disabled={isStakeButtonDisabled}
              className={`group w-full flex items-center justify-center px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                isStakeButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Stake
              <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-5 sm:h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 w-full"
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-2 sm:mb-4 font-geist">
            Your Referral Link
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 md:space-x-4 space-y-2 sm:space-y-0">
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono truncate flex-1">
              {`${window.location.origin}/dashboard/staking?ref=${
                account?.address || "0x0"
              }`}
            </p>
            <button
              onClick={handleCopyReferralLink}
              className="group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
            >
              <Copy className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
              Copy
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-4 sm:mb-6 md:mb-8 w-full"
        data-tooltip-id="referral-bonus-tooltip"
        data-tooltip-content="Earn 0.5 USDT per referred user who stakes."
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-2 sm:mb-4 font-geist">
          Referral Bonus
        </h3>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white font-geist">
          {formatUSDT(referralBonus)} USDT
        </p>
        <p className="text-slate-400 text-xs sm:text-sm font-geist-mono mb-2 sm:mb-4">
          Minimum {ethers.formatUnits(minReferralWithdrawal, usdtDecimals)} USDT
          to withdraw
        </p>
        <button
          onClick={handleWithdrawReferralBonus}
          disabled={
            isActionLoading ||
            !account ||
            referralBonus < minReferralWithdrawal ||
            isSuspended.isSuspended
          }
          className={`group flex items-center justify-center px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm ${
            isActionLoading ||
            !account ||
            referralBonus < minReferralWithdrawal ||
            isSuspended.isSuspended
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          Withdraw Referral Bonus
          <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 mb-4 sm:mb-6 md:mb-8 w-full"
      >
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 mb-2 sm:mb-4 font-geist">
          Your Stakes
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-cyan-700/30">
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                  Amount (USDT)
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[90px]">
                  Start Date
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[90px]">
                  Rewards (USDT)
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3 min-w-[70px]">
                  Status
                </th>
                <th className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakes.map((stake) => {
                const { label, color } = getStakeStatus(stake);
                return (
                  <tr key={stake.id} className="border-b border-cyan-700/30">
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      {formatUSDT(stake.amountWei)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      {new Date(
                        Number(stake.startTimestamp) * 1000
                      ).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      {Number(stake.pendingReward).toFixed(2)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      <span
                        className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${color} text-slate-200`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 md:px-3">
                      <button
                        onClick={() => setSelectedStake(stake)}
                        className="text-cyan-600 hover:underline text-xs sm:text-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {stakes.length === 0 && (
          <p className="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-4 font-geist-mono">
            No stakes yet. Stake USDT to start earning rewards!
          </p>
        )}
      </motion.div>

      <ReactModal
        isOpen={!!selectedStake}
        onRequestClose={() => setSelectedStake(null)}
        className="bg-slate-900 p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
              Stake Details
            </h3>
            <button
              onClick={() => setSelectedStake(null)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
            </button>
          </div>
          {selectedStake && (
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
                  Amount Staked
                </p>
                <p className="text-sm sm:text-base md:text-lg text-slate-200 font-geist">
                  {formatUSDT(selectedStake.amountWei)} USDT
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
                  Start Date
                </p>
                <p className="text-sm sm:text-base md:text-lg text-slate-200 font-geist">
                  {new Date(
                    Number(selectedStake.startTimestamp) * 1000
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
                  Pending Rewards
                </p>
                <p className="text-sm sm:text-base md:text-lg text-slate-200 font-geist">
                  {Number(selectedStake.pendingReward).toFixed(2)} USDT
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
                  Status
                </p>
                <span
                  className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${
                    getStakeStatus(selectedStake).color
                  } text-slate-200 font-geist-mono`}
                >
                  {getStakeStatus(selectedStake).label}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                <button
                  onClick={() =>
                    handleWithdrawReward(
                      selectedStake.id,
                      selectedStake.pendingReward
                    )
                  }
                  disabled={
                    isActionLoading ||
                    selectedStake.pendingReward <= 0 ||
                    isSuspended.isSuspended
                  }
                  className={`group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                    isActionLoading ||
                    selectedStake.pendingReward <= 0 ||
                    isSuspended.isSuspended
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Withdraw Rewards
                  <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={() =>
                    handleUnstake(selectedStake.id, selectedStake.amount)
                  }
                  disabled={
                    isActionLoading ||
                    selectedStake.amount <= 0 ||
                    isSuspended.isSuspended
                  }
                  className={`group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                    isActionLoading ||
                    selectedStake.amount <= 0 ||
                    isSuspended.isSuspended
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Unstake
                  <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={() => handleCompound(selectedStake.id)}
                  disabled={
                    isActionLoading ||
                    selectedStake.pendingReward <= 0 ||
                    isSuspended.isSuspended
                  }
                  className={`group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-xs sm:text-sm ${
                    isActionLoading ||
                    selectedStake.pendingReward <= 0 ||
                    isSuspended.isSuspended
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Compound
                  <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </ReactModal>

      <Tooltip
        id="usdt-balance-tooltip"
        place="top"
        className="text-xs sm:text-sm font-geist-mono bg-slate-800 text-slate-200"
      />
      <Tooltip
        id="referral-bonus-tooltip"
        place="top"
        className="text-xs sm:text-sm font-geist-mono bg-slate-800 text-slate-200"
      />
    </div>
  );
}
