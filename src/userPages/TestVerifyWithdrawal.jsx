
     import { useState } from "react";

     function TestWithdrawal() {
       const [response, setResponse] = useState(null);

       const testWithdrawal = async () => {
         try {
           const res = await fetch("http://localhost:3001/api/create-withdrawal", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               userId: "0x1234567890123456789012345678901234567890",
               usdtAmount: 100,
               bankDetails: {
                 bankName: "Zenith Bank",
                 accountNumber: "1234567890",
                 accountName: "John Doe",
               },
               txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
             }),
           });
           const data = await res.json();
           setResponse(data);
           console.log("Withdrawal response:", data);
         } catch (error) {
           console.error("Error:", error);
         }
       };

       return (
         <div>
           <button onClick={testWithdrawal}>Test Withdrawal</button>
           {response && <pre>{JSON.stringify(response, null, 2)}</pre>}
         </div>
       );
     }

     export default TestWithdrawal;
     