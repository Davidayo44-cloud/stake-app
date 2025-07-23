import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getContract,
  createThirdwebClient,
  defineChain,
  prepareContractCall,
  sendTransaction,
} from "thirdweb";
import {
  ArrowRight,
  Copy,
  CheckCircle,
  AlertTriangle,
  History,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import ReactModal from "react-modal";
import debounce from "lodash/debounce";
import { useActiveAccount } from "thirdweb/react";

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});

// Define BSC chain
const bscChain = defineChain({
  id: parseInt(import.meta.env.VITE_CHAIN_ID, 10),
  rpc: import.meta.env.VITE_RPC_URL,
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
});

// Withdrawal contract ABI
const WithdrawalABI = [
  "function executeMetaWithdrawal(address user, uint256 amount, string bankDetails, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
  "function nonces(address user) external view returns (uint256)",
  "event WithdrawalInitiated(address indexed user, uint256 amount, bytes32 indexed txHash, string bankDetails)",
];

// USDT ABI
const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// Environment variables
const requiredEnvVars = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_WITHDRAWAL_CONTRACT_ADDRESS: import.meta.env
    .VITE_WITHDRAWAL_CONTRACT_ADDRESS,
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_USDT_RATE: import.meta.env.VITE_USDT_RATE || "1600",
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS || "6",
  VITE_WITHDRAWAL_RELAYER_URL:
    import.meta.env.VITE_WITHDRAWAL_RELAYER_URL ||
    "http://localhost:3001/relay-withdrawal",
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "WithdrawCrypto.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

const {
  VITE_API_BASE_URL,
  VITE_WITHDRAWAL_CONTRACT_ADDRESS,
  VITE_USDT_ADDRESS,
  VITE_USDT_RATE,
  VITE_USDT_DECIMALS,
  VITE_WITHDRAWAL_RELAYER_URL,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
} = requiredEnvVars;

const MIN_WITHDRAWAL_AMOUNT =
  parseInt(import.meta.env.VITE_MIN_WITHDRAWAL_AMOUNT, 10) /
    Math.pow(10, parseInt(import.meta.env.VITE_USDT_DECIMALS, 10)) || 1;
const usdtRate = parseFloat(VITE_USDT_RATE);
if (isNaN(usdtRate) || usdtRate <= 0) {
  console.error("WithdrawCrypto.jsx: Invalid USDT rate:", VITE_USDT_RATE);
  throw new Error("Invalid USDT rate");
}

const usdtDecimals = parseInt(VITE_USDT_DECIMALS, 10);
if (isNaN(usdtDecimals) || usdtDecimals <= 0) {
  console.error(
    "WithdrawCrypto.jsx: Invalid USDT decimals:",
    VITE_USDT_DECIMALS
  );
  throw new Error("Invalid USDT decimals");
}

/** @typedef {{ usdtAmount: string, bankName: string, accountNumber: string, accountName: string }} FormData */
/** @typedef {{ usdtAmount: boolean, bankName: boolean, accountNumber: boolean, accountName: boolean }} FormValidation */

/**
 * Custom hook for contract initialization
 * @returns {{ provider: ethers.JsonRpcProvider | null, usdtContract: ethers.Contract | null, withdrawalContract: ethers.Contract | null, error: string }}
 */
const useWithdrawalContract = () => {
  const [state, setState] = useState({
    provider: null,
    usdtContract: null,
    withdrawalContract: null,
    error: "",
  });

  useEffect(() => {
    const init = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);
        const usdtContract = new ethers.Contract(
          VITE_USDT_ADDRESS,
          USDT_ABI,
          provider
        );
        const withdrawalContract = new ethers.Contract(
          VITE_WITHDRAWAL_CONTRACT_ADDRESS,
          WithdrawalABI,
          provider
        );
        setState({ provider, usdtContract, withdrawalContract, error: "" });
      } catch (err) {
        console.error("Contract initialization error:", err);
        setState((prev) => ({
          ...prev,
          error: "Failed to initialize contracts. Please try again.",
        }));
      }
    };
    init();
  }, []);

  return state;
};

/**
 * Custom hook for form validation
 * @param {FormData} formData
 * @returns {{ isFormValid: FormValidation, nairaEquivalent: number }}
 */
const useFormValidation = (formData) => {
  const [isFormValid, setIsFormValid] = useState({
    usdtAmount: true,
    bankName: true,
    accountNumber: true,
    accountName: true,
  });
  const [nairaEquivalent, setNairaEquivalent] = useState(0);

  const validate = useCallback(
    debounce(() => {
      const usdtAmountNum = Number(formData.usdtAmount);
      setIsFormValid({
        usdtAmount:
          !isNaN(usdtAmountNum) && usdtAmountNum >= MIN_WITHDRAWAL_AMOUNT,
        bankName: formData.bankName.trim().length > 0,
        accountNumber:
          formData.accountNumber.trim().length > 0 &&
          /^\d{10}$/.test(formData.accountNumber),
        accountName: formData.accountName.trim().length > 0,
      });
      setNairaEquivalent(usdtAmountNum * usdtRate);
    }, 300),
    [formData]
  );

  useEffect(() => {
    validate();
    return () => validate.cancel();
  }, [formData, validate]);

  return { isFormValid, nairaEquivalent };
};

/**
 * Main WithdrawCrypto component
 */
export default function WithdrawCrypto() {
  const account = useActiveAccount();
  const {
    provider,
    usdtContract,
    withdrawalContract,
    error: contractError,
  } = useWithdrawalContract();
  const [formData, setFormData] = useState({
    usdtAmount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const { isFormValid, nairaEquivalent } = useFormValidation(formData);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState({});
  const [withdrawals, setWithdrawals] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isWithdrawConfirmModalOpen, setIsWithdrawConfirmModalOpen] =
    useState(false);
  const [isCancelConfirmModalOpen, setIsCancelConfirmModalOpen] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const withdrawalsPerPage = 5;
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Set modal app element
  useEffect(() => {
    try {
      ReactModal.setAppElement("#root");
    } catch (err) {
      console.warn("Failed to set ReactModal app element:", err.message);
      toast.error("Modal initialization failed. Please refresh the page.");
    }
  }, []);

  // Validate persisted withdrawal state
  useEffect(() => {
    const savedTransactionId = sessionStorage.getItem("pendingWithdrawalId");
    if (savedTransactionId && account?.address) {
      const validateWithdrawal = async () => {
        try {
          const response = await fetch(
            `${VITE_API_BASE_URL}/api/check-withdrawal-status`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transactionId: savedTransactionId }),
            }
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Failed to check withdrawal status");
          if (
            data.status === "pending" ||
            data.status === "awaiting verification"
          ) {
            setTransactionId(savedTransactionId);
            setShowConfirmation(true);
            setPendingWithdrawal({
              _id: savedTransactionId,
              status: data.status,
            });
            toast("You have a pending withdrawal. Please await verification.", {
              icon: "ℹ️",
            });
          } else if (data.status === "verified" || data.status === "failed") {
            sessionStorage.removeItem("pendingWithdrawalId");
          }
        } catch (error) {
          console.error("Validate withdrawal error:", error);
          sessionStorage.removeItem("pendingWithdrawalId");
          toast.error("Failed to validate pending withdrawal.");
        }
      };
      validateWithdrawal();
    }
    if (account?.address) checkPendingWithdrawal();
  }, [account]);

  // Fetch withdrawal history
  useEffect(() => {
    if (!account?.address) return;
    const fetchWithdrawals = async () => {
      try {
        const response = await fetch(`${VITE_API_BASE_URL}/api/withdrawals`, {
          headers: {
            "Content-Type": "application/json",
            useraddress: account.address,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch withdrawals");
        }
        const data = await response.json();
        setWithdrawals(
          data.map((wd) => ({
            ...wd,
            status:
              wd.status === "awaiting verification" ? "awaiting" : wd.status,
          }))
        );
      } catch (error) {
        console.error("Fetch withdrawals error:", error);
        toast.error(`Failed to load withdrawal history: ${error.message}`);
      }
    };
    fetchWithdrawals();
  }, [account?.address]);

  // Poll withdrawal status
  useEffect(() => {
    if (!transactionId || !showConfirmation) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${VITE_API_BASE_URL}/api/check-withdrawal-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId }),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to check status");
        if (data.status === "verified") {
          toast.success(
            "Withdrawal verified! Naira credited to your bank account."
          );
          setShowConfirmation(false);
          setTransactionId("");
          setPendingWithdrawal(null);
          setFormData({
            usdtAmount: "",
            bankName: "",
            accountNumber: "",
            accountName: "",
          });
          sessionStorage.removeItem("pendingWithdrawalId");
          const wdResponse = await fetch(
            `${VITE_API_BASE_URL}/api/withdrawals`,
            {
              headers: {
                "Content-Type": "application/json",
                useraddress: account.address,
              },
            }
          );
          if (wdResponse.ok) {
            setWithdrawals(
              (await wdResponse.json()).map((wd) => ({
                ...wd,
                status:
                  wd.status === "awaiting verification"
                    ? "awaiting"
                    : wd.status,
              }))
            );
          }
        } else if (data.status === "failed") {
          toast.error("Withdrawal failed. Please contact support.");
          resetForm();
        }
      } catch (error) {
        console.error("Check withdrawal status error:", error);
        toast.error("Failed to check withdrawal status.");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [transactionId, showConfirmation, account]);

  // Check for pending withdrawals
  const checkPendingWithdrawal = useCallback(async () => {
    if (!account?.address) return;
    try {
      const response = await fetch(`${VITE_API_BASE_URL}/api/withdrawals`, {
        headers: {
          "Content-Type": "application/json",
          useraddress: account.address,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch withdrawals");
      }
      const data = await response.json();
      const pending = data.find(
        (wd) => wd.status === "pending" || wd.status === "awaiting"
      );
      if (pending) {
        setPendingWithdrawal(pending);
        setTransactionId(pending._id);
        setShowConfirmation(true);
        setFormData({
          usdtAmount: pending.usdtAmount,
          bankName: pending.bankDetails.bankName,
          accountNumber: pending.bankDetails.accountNumber,
          accountName: pending.bankDetails.accountName,
        });
        sessionStorage.setItem("pendingWithdrawalId", pending._id);
        toast("You have a pending withdrawal. Please await verification.", {
          icon: "ℹ️",
        });
      }
    } catch (error) {
      console.error("Check pending withdrawal error:", error);
      toast.error("Failed to check pending withdrawals.");
    }
  }, [account]);

  // Retry wrapper for RPC calls
  const withRetry = async (fn, retries = 3, delay = 200) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        console.error(`Retry attempt ${i + 1} failed:`, err.message);
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Handle gasless withdrawal
  // Replace the handleGaslessWithdrawal function in WithdrawCrypto.jsx with the following:
const handleGaslessWithdrawal = useCallback(async () => {
  if (!account?.address) {
    toast.error("Please connect your wallet");
    return;
  }
  if (!ethers.isAddress(account.address)) {
    toast.error("Invalid wallet address");
    return;
  }
  if (!usdtContract || !withdrawalContract || !provider) {
    toast.error("Contracts or provider not initialized");
    return;
  }
  if (
    !isFormValid.usdtAmount ||
    !isFormValid.bankName ||
    !isFormValid.accountNumber ||
    !isFormValid.accountName
  ) {
    toast.error("Please fill in all fields correctly");
    return;
  }

  setIsLoading(true);
  const toastId = toast.loading("Processing withdrawal...");

  try {
    const chainId = await provider
      .getNetwork()
      .then((network) => network.chainId);
    if (Number(chainId) !== 56)
      throw new Error("Wallet must be connected to BSC (chain ID 56)");
    if (parseInt(VITE_CHAIN_ID, 10) !== 56)
      throw new Error("VITE_CHAIN_ID must be 56");

    // Use VITE_USDT_DECIMALS=18
    const usdtDecimals = parseInt(VITE_USDT_DECIMALS, 10);
    if (isNaN(usdtDecimals) || usdtDecimals <= 0)
      throw new Error("Invalid USDT decimals");
    if (usdtDecimals !== 18)
      console.warn(
        "Warning: VITE_USDT_DECIMALS is not 18, contract expects 18 decimals"
      );

    const amountNum = parseFloat(formData.usdtAmount);
    if (isNaN(amountNum) || amountNum < 1)
      throw new Error("Amount must be at least 1 USDT");
    const usdtAmount = ethers.parseUnits(amountNum.toString(), usdtDecimals);
    const bankDetails = JSON.stringify(
      {
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountName: formData.accountName.trim(),
      },
      null,
      0
    );

    // Log contract address for debugging
    console.log(
      "Withdrawal contract address:",
      VITE_WITHDRAWAL_CONTRACT_ADDRESS
    );

    // Check balance and allowance
    const [balance, allowance] = await Promise.all([
      withRetry(() => usdtContract.balanceOf(account.address)),
      withRetry(() =>
        usdtContract.allowance(
          account.address,
          VITE_WITHDRAWAL_CONTRACT_ADDRESS
        )
      ),
    ]);
    if (balance < usdtAmount) {
      throw new Error(
        `Insufficient USDT balance: ${ethers.formatUnits(
          balance,
          usdtDecimals
        )} < ${formData.usdtAmount}`
      );
    }
    if (allowance < usdtAmount) {
      const transactionObj = await prepareContractCall({
        contract: getContract({
          client,
          chain: bscChain,
          address: VITE_USDT_ADDRESS,
          abi: USDT_ABI,
        }),
        method: "approve",
        params: [VITE_WITHDRAWAL_CONTRACT_ADDRESS, usdtAmount],
        gas: BigInt(100000),
      });
      const transactionResult = await sendTransaction({
        account,
        transaction: transactionObj,
      });
      const receipt = await provider.waitForTransaction(
        transactionResult.transactionHash,
        1,
        60000
      );
      if (receipt.status !== 1) throw new Error("Approval transaction failed");
    }

    // EIP-712 Signing
    const nonce = await withRetry(() =>
      withdrawalContract.nonces(account.address)
    );
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const domain = {
      name: "Withdrawal",
      version: "1",
      chainId: 56,
      verifyingContract: VITE_WITHDRAWAL_CONTRACT_ADDRESS,
    };
    const types = {
      Withdraw: [
        { name: "user", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "bankDetails", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      user: account.address,
      amount: usdtAmount.toString(),
      bankDetails,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };

    console.log("EIP-712 data:", {
      domain,
      types,
      message,
      nonce: nonce.toString(),
    });

    let signature;
    try {
      signature = await account.signTypedData({ domain, types, message });
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
    } catch (signErr) {
      console.error("signTypedData error:", {
        message: signErr.message,
        response: signErr.response?.data,
        stack: signErr.stack,
      });
      throw new Error(`Failed to sign typed data: ${signErr.message}`);
    }

    const { v, r, s } = ethers.Signature.from(signature);
    const args = [
      account.address,
      usdtAmount.toString(),
      bankDetails,
      deadline.toString(),
      v,
      r,
      s,
    ];

    const response = await fetch(VITE_WITHDRAWAL_RELAYER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractAddress: VITE_WITHDRAWAL_CONTRACT_ADDRESS,
        functionName: "executeMetaWithdrawal",
        args,
        userAddress: account.address,
        signature,
        chainId: 56,
        speed: "fast",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Relayer error: ${errorData.error || response.statusText}`
      );
    }
    const result = await response.json();
    if (!result.hash)
      throw new Error("Relayer response missing transaction hash");
    console.log("Relayer response:", result);
    const receipt = await provider.waitForTransaction(result.hash, 1, 60000);
    if (receipt.status !== 1) throw new Error("Withdrawal transaction failed");

    toast.success(`Successfully withdrew ${formData.usdtAmount} USDT!`, {
      id: toastId,
    });
  
    return { hash: result.hash }; // Return hash for confirmWithdrawal
  } catch (err) {
    console.error("Withdrawal Error:", {
      message: err.message,
      stack: err.stack,
    });
    let errorMessage = "Failed to withdraw.";
    if (err.message.includes("Insufficient USDT balance")) {
      errorMessage = err.message;
    } else if (err.message.includes("Amount must be at least")) {
      errorMessage = err.message;
    } else if (err.message.includes("Approval transaction failed")) {
      errorMessage = "Failed to approve USDT.";
    } else if (err.message.includes("Invalid signature")) {
      errorMessage = "Invalid signature. Please try again.";
    } else if (err.message.includes("Signature expired")) {
      errorMessage = "Transaction deadline expired. Please try again.";
    } else if (err.message.includes("Relayer error")) {
      errorMessage = `Relayer error: ${err.message}`;
    } else if (err.message.includes("Do not know how to serialize a BigInt")) {
      errorMessage = "Invalid data format. Please try again.";
    }
    toast.error(errorMessage, { id: toastId });
    throw new Error(errorMessage); // Rethrow to handle in confirmWithdrawal
  } finally {
    setIsLoading(false);
  }
}, [account, formData, isFormValid]);



  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!account?.address) return toast.error("Please connect your wallet");
      if (
        !isFormValid.usdtAmount ||
        !isFormValid.bankName ||
        !isFormValid.accountNumber ||
        !isFormValid.accountName
      ) {
        return toast.error("Please fill out all fields correctly");
      }
      if (pendingWithdrawal) {
        setIsPendingModalOpen(true);
        return;
      }
      setIsWithdrawConfirmModalOpen(true);
    },
    [account, isFormValid, pendingWithdrawal]
  );

  // Confirm withdrawal
const confirmWithdrawal = useCallback(async () => {
  setIsLoading(true);
  const toastId = toast.loading("Processing withdrawal...");
  try {
    const { hash } = await handleGaslessWithdrawal();
    const response = await fetch(`${VITE_API_BASE_URL}/api/create-withdrawal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: account.address,
        usdtAmount: Number(formData.usdtAmount),
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        },
        txHash: hash, // Use hash instead of txHash
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.error.includes("pending withdrawal")) {
        setPendingWithdrawal({ _id: data.transactionId });
        setTransactionId(data.transactionId);
        setShowConfirmation(true);
        sessionStorage.setItem("pendingWithdrawalId", data.transactionId);
        toast("You have a pending withdrawal. Please await verification.", {
          id: toastId,
          icon: "ℹ️",
        });
        return;
      }
      throw new Error(data.error || "Failed to create withdrawal");
    }
    setTransactionId(data.transactionId);
    setShowConfirmation(true);
    setPendingWithdrawal({ _id: data.transactionId });
    sessionStorage.setItem("pendingWithdrawalId", data.transactionId);
    toast.success("Withdrawal initiated! Awaiting verification.", {
      id: toastId,
    });
    setFormData({
      usdtAmount: "",
      bankName: "",
      accountNumber: "",
      accountName: "",
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    const errorMessages = {
      "Please connect your wallet": "Please connect your wallet to proceed.",
      "Invalid wallet address":
        "Your wallet address is invalid. Please check and try again.",
      "Contracts or provider not initialized":
        "Failed to initialize contracts. Please refresh the page.",
      "Invalid form data":
        "Please ensure all form fields are filled correctly.",
      "Insufficient USDT balance": error.message,
      "Insufficient BNB for gas": error.message,
      "Invalid signature format":
        "Failed to sign transaction. Please try again.",
      "Signature does not recover to user address":
        "Invalid signature. Please reconnect your wallet and try again.",
      "Transaction reverted": error.message,
      "No transaction hash returned":
        "Transaction failed to process. Please try again.",
      "Relayer out of funds": "Relayer out of funds. Please contact the admin.",
      "Invalid Defender API credentials":
        "Invalid Defender API credentials. Please contact the admin.",
      "Invalid transaction parameters":
        "Invalid transaction parameters: Check relayer funds, contract address, or gas limit.",
      default: `Failed to process withdrawal: ${error.message}`,
    };
    toast.error(errorMessages[error.message] || errorMessages.default, {
      id: toastId,
    });
  } finally {
    setIsLoading(false);
    setIsWithdrawConfirmModalOpen(false);
  }
}, [account, formData, handleGaslessWithdrawal]);

  // Reset form
  const resetForm = useCallback(() => {
    setShowConfirmation(false);
    setTransactionId("");
    setPendingWithdrawal(null);
    sessionStorage.removeItem("pendingWithdrawalId");
    setFormData({
      usdtAmount: "",
      bankName: "",
      accountNumber: "",
      accountName: "",
    });
  }, []);

  // Confirm cancellation
  const confirmCancel = useCallback(async () => {
    if (!transactionId) {
      toast.error("No withdrawal found to cancel.");
      setIsCancelConfirmModalOpen(false);
      return;
    }
    setIsLoading(true);
    const toastId = toast.loading("Cancelling withdrawal...");
    try {
      const response = await fetch(
        `${VITE_API_BASE_URL}/api/cancel-withdrawal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to cancel withdrawal");
      toast.success("Withdrawal cancelled successfully.", { id: toastId });
      resetForm();
      const wdResponse = await fetch(`${VITE_API_BASE_URL}/api/withdrawals`, {
        headers: {
          "Content-Type": "application/json",
          useraddress: account.address,
        },
      });
      if (wdResponse.ok) {
        setWithdrawals(
          (await wdResponse.json()).map((wd) => ({
            ...wd,
            status:
              wd.status === "awaiting verification" ? "awaiting" : wd.status,
          }))
        );
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      toast.error(`Failed to cancel withdrawal: ${error.message}`, {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
      setIsCancelConfirmModalOpen(false);
    }
  }, [account, transactionId, resetForm]);

  // Copy text
  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess((prev) => ({ ...prev, [field]: true }));
      toast.success(
        `${
          field === "transactionId" ? "Transaction ID" : field
        } copied to clipboard!`
      );
      setTimeout(
        () => setCopySuccess((prev) => ({ ...prev, [field]: false })),
        2000
      );
    } catch (err) {
      console.error(`Error copying ${field}:`, err);
      toast.error(`Failed to copy ${field}`);
    }
  }, []);

  // Paginated withdrawals
  const paginatedWithdrawals = useMemo(() => {
    const start = (currentPage - 1) * withdrawalsPerPage;
    return withdrawals.slice(start, start + withdrawalsPerPage);
  }, [withdrawals, currentPage]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-500";
      case "verified":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "awaiting":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1440 320%22%3E%3Cpath fill=%22%23a5f3fc%22 fill-opacity=%220.1%22 d=%22M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,186.7C960,192,1056,160,1152,138.7C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z%22%3E%3C/path%3E%3C/svg%3E')] bg-no-repeat bg-bottom opacity-30 z-0" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-extrabold text-white mb-8"
        >
          Withdraw USDT
        </motion.h2>

        {contractError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 text-red-200 p-4 rounded-lg mb-6 flex items-center"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            {contractError}
          </motion.div>
        )}

        <AnimatePresence>
          {!showConfirmation ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              onSubmit={handleSubmit}
              className="bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/20 shadow-lg"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    USDT Amount
                  </label>
                  <input
                    type="number"
                    value={formData.usdtAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, usdtAmount: e.target.value })
                    }
                    placeholder="Enter amount to withdraw"
                    className={`w-full px-4 py-2 bg-slate-700/50 border ${
                      isFormValid.usdtAmount
                        ? "border-cyan-500"
                        : "border-red-500"
                    } rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors`}
                    disabled={isLoading}
                  />
                  {!isFormValid.usdtAmount && (
                    <p className="text-red-400 text-xs mt-1">
                      Minimum withdrawal is 1 USDT
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Naira Equivalent
                  </label>
                  <div className="px-4 py-2 bg-slate-700/50 border border-cyan-500 rounded-lg text-slate-200">
                    ₦
                    {nairaEquivalent.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    placeholder="Enter bank name"
                    className={`w-full px-4 py-2 bg-slate-700/50 border ${
                      isFormValid.bankName
                        ? "border-cyan-500"
                        : "border-red-500"
                    } rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors`}
                    disabled={isLoading}
                  />
                  {!isFormValid.bankName && (
                    <p className="text-red-400 text-xs mt-1">
                      Bank name is required
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                    placeholder="Enter account number"
                    className={`w-full px-4 py-2 bg-slate-700/50 border ${
                      isFormValid.accountNumber
                        ? "border-cyan-500"
                        : "border-red-500"
                    } rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors`}
                    disabled={isLoading}
                  />
                  {!isFormValid.accountNumber && (
                    <p className="text-red-400 text-xs mt-1">
                      Valid 10-digit account number required
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountName: e.target.value })
                    }
                    placeholder="Enter account name"
                    className={`w-full px-4 py-2 bg-slate-700/50 border ${
                      isFormValid.accountName
                        ? "border-cyan-500"
                        : "border-red-500"
                    } rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors`}
                    disabled={isLoading}
                  />
                  {!isFormValid.accountName && (
                    <p className="text-red-400 text-xs mt-1">
                      Account name is required
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !account ||
                  !isFormValid.usdtAmount ||
                  !isFormValid.bankName ||
                  !isFormValid.accountNumber ||
                  !isFormValid.accountName
                }
                className="mt-6 w-full flex items-center justify-center px-4 py-3 bg-cyan-600 text-slate-900 rounded-lg hover:bg-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-slate-900"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                {isLoading ? "Processing..." : "Withdraw USDT"}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/20 shadow-lg"
            >
              <h3 className="text-xl font-bold text-cyan-400 mb-4">
                Withdrawal Initiated
              </h3>
              <p className="text-sm text-slate-300 mb-2">
                Your withdrawal of{" "}
                <span className="font-semibold">
                  {formData.usdtAmount} USDT
                </span>{" "}
                (₦
                {nairaEquivalent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
                ) to {formData.bankName} is pending verification.
              </p>
              <div className="flex items-center text-sm text-slate-300 mb-4">
                <span className="truncate max-w-xs">
                  Transaction ID: {transactionId}
                </span>
                <button
                  onClick={() => handleCopy(transactionId, "transactionId")}
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                >
                  {copySuccess.transactionId ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsPendingModalOpen(true)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 transition-all duration-300"
                  disabled={isLoading}
                >
                  New Withdrawal
                </button>
                <button
                  onClick={() => setIsCancelConfirmModalOpen(true)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600 transition-all duration-300"
                  disabled={isLoading}
                >
                  Cancel Withdrawal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            <History className="w-4 h-4 mr-2" />
            {showHistory ? "Hide History" : "Show History"}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-4 bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/20 shadow-lg"
              >
                <h3 className="text-lg font-bold text-white mb-4">
                  Withdrawal History
                </h3>
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-slate-300">No withdrawals yet.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-slate-200">
                        <thead>
                          <tr className="border-b border-cyan-500/20">
                            <th className="py-3 px-4">Amount (USDT)</th>
                            <th className="py-3 px-4">Bank Details</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedWithdrawals.map((wd) => (
                            <tr
                              key={wd._id}
                              className="border-b border-cyan-500/20 cursor-pointer hover:bg-slate-700/50 transition-colors"
                              onClick={() => {
                                setSelectedWithdrawal(wd);
                                setIsDetailsModalOpen(true);
                              }}
                            >
                              <td className="py-3 px-4">{wd.usdtAmount}</td>
                              <td className="py-3 px-4">
                                {wd.bankDetails.bankName} -{" "}
                                {wd.bankDetails.accountNumber}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
                                    wd.status
                                  )}`}
                                >
                                  {wd.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {new Date(wd.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1 || isLoading}
                        className="px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-300">
                        Page {currentPage} of{" "}
                        {Math.ceil(withdrawals.length / withdrawalsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={
                          currentPage >=
                            Math.ceil(
                              withdrawals.length / withdrawalsPerPage
                            ) || isLoading
                        }
                        className="px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <ReactModal
          isOpen={isPendingModalOpen}
          onRequestClose={() => setIsPendingModalOpen(false)}
          className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
          overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              Pending Withdrawal
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              You have a pending withdrawal. Please await verification before
              initiating a new one.
            </p>
            <button
              onClick={() => setIsPendingModalOpen(false)}
              className="w-full px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Close
            </button>
          </motion.div>
        </ReactModal>

        <ReactModal
          isOpen={isWithdrawConfirmModalOpen}
          onRequestClose={() => setIsWithdrawConfirmModalOpen(false)}
          className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
          overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              Confirm Withdrawal
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              Withdraw{" "}
              <span className="font-semibold">{formData.usdtAmount} USDT</span>{" "}
              (₦
              {nairaEquivalent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
              ) to {formData.bankName} - {formData.accountNumber} (
              {formData.accountName})?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={confirmWithdrawal}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-cyan-600 text-slate-900 rounded-lg hover:bg-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-2 inline-block"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  "Confirm"
                )}
              </button>
              <button
                onClick={() => setIsWithdrawConfirmModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600 transition-all duration-300"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </ReactModal>

        <ReactModal
          isOpen={isCancelConfirmModalOpen}
          onRequestClose={() => setIsCancelConfirmModalOpen(false)}
          className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
          overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              Cancel Withdrawal
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to cancel your withdrawal request?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={confirmCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-slate-900 rounded-lg hover:bg-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-2 inline-block"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  "Confirm Cancel"
                )}
              </button>
              <button
                onClick={() => setIsCancelConfirmModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 transition-all duration-300"
                disabled={isLoading}
              >
                Keep Withdrawal
              </button>
            </div>
          </motion.div>
        </ReactModal>
        <ReactModal
          isOpen={isDetailsModalOpen}
          onRequestClose={() => setIsDetailsModalOpen(false)}
          className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-[90vw] sm:max-w-md mx-auto my-4 sm:my-12 border border-cyan-500/20 shadow-xl z-[60]"
          overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-base sm:text-lg font-bold text-white mb-4">
              Withdrawal Details
            </h3>
            {selectedWithdrawal && (
              <div className="text-xs sm:text-sm text-slate-300 space-y-2">
                <div className="flex items-center flex-wrap">
                  <span className="font-semibold mr-2">Transaction ID:</span>
                  <span className="truncate max-w-[70%] sm:max-w-xs">
                    {selectedWithdrawal._id}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(selectedWithdrawal._id, "transactionId")
                    }
                    className="ml-2 text-cyan-400 hover:text-cyan-300"
                  >
                    {copySuccess.transactionId ? (
                      <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4" />
                    ) : (
                      <Copy className="w-3 sm:w-4 h-3 sm:h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center flex-wrap">
                  <span className="font-semibold mr-2">Transaction Hash:</span>
                  <span className="truncate max-w-[70%] sm:max-w-xs">
                    {selectedWithdrawal.txHash || "N/A"}
                  </span>
                  {selectedWithdrawal.txHash && (
                    <button
                      onClick={() =>
                        handleCopy(selectedWithdrawal.txHash, "txHash")
                      }
                      className="ml-2 text-cyan-400 hover:text-cyan-300"
                    >
                      {copySuccess.txHash ? (
                        <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4" />
                      ) : (
                        <Copy className="w-3 sm:w-4 h-3 sm:h-4" />
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Amount:</span>{" "}
                  {selectedWithdrawal.usdtAmount} USDT
                </div>
                <div>
                  <span className="font-semibold">Naira Equivalent:</span> ₦
                  {(selectedWithdrawal.usdtAmount * usdtRate).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </div>
                <div>
                  <span className="font-semibold">Bank Name:</span>{" "}
                  {selectedWithdrawal.bankDetails.bankName}
                </div>
                <div>
                  <span className="font-semibold">Account Number:</span>{" "}
                  {selectedWithdrawal.bankDetails.accountNumber}
                </div>
                <div>
                  <span className="font-semibold">Account Name:</span>{" "}
                  {selectedWithdrawal.bankDetails.accountName}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
                      selectedWithdrawal.status
                    )}`}
                  >
                    {selectedWithdrawal.status}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Date:</span>{" "}
                  {new Date(selectedWithdrawal.createdAt).toLocaleString()}
                </div>
              </div>
            )}
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="w-full mt-4 sm:mt-6 px-4 py-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={isLoading}
            >
              Close
            </button>
          </motion.div>
        </ReactModal>
      </div>
    </div>
  );
}
