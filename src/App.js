import { useState, useEffect } from 'react';
import { ethers } from 'ethers'
import Logo from './logo.svg'

function App() {

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState()
  const [balance, setBalance] = useState("0")
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [network, setNetwork] = useState('sepolia')

  const connect = async () => {
    try {
      const db = await openDatabase();
      const encryptedKey = await getEncryptedKey(db);
      let provider, address;

      if (encryptedKey) {
        const privateKey = await decryptPrivateKey(encryptedKey.encryptedData, encryptedKey.iv, encryptedKey.key);
        provider = new ethers.InfuraProvider(network);
        const wallet = new ethers.Wallet(privateKey, provider);
        address = await wallet.getAddress();
      } else {
        provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      }

      setConnected(true);
      setAccount(address);
      setHasStoredKey(true);
      await fetchBalance(address, provider);
    } catch (error) {
      console.log(error.message);
    }
  }

  const disconnect = async () => {
    setConnected(false)
    setAccount(null)
  }

  const deleteAccount = async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(["keys"], "readwrite");
      const store = transaction.objectStore("keys");
      await store.delete("walletPrivateKey");
      setConnected(false);
      setAccount(null);
      setHasStoredKey(false);
    } catch (error) {
      console.log(error.message);
    }
  }

  const createAccount = async () => {
    try {
      const provider = new ethers.InfuraProvider(network);
      const wallet = ethers.Wallet.createRandom(provider);
      const encryptedData = await encryptPrivateKey(wallet.privateKey);
      const db = await openDatabase();
      await storeEncryptedKey(db, encryptedData);
      setAccount(wallet.address);
      setConnected(true);
      await fetchBalance(wallet.address, provider);
    } catch (error) {
      console.log(error.message);
    }
  }

  const fetchBalance = async (address, provider) => {
    try {
      const balance = await provider.getBalance(address)
      setBalance(balance.toString())
    } catch (error) {
      console.log('Error fetching balance:', error.message)
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("WalletDatabase", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("keys", { keyPath: "id" });
      };
    });
  }

  function storeEncryptedKey(db, encryptedData) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["keys"], "readwrite");
      const store = transaction.objectStore("keys");
      const request = store.put({ id: "walletPrivateKey", ...encryptedData });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  function getEncryptedKey(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["keys"], "readonly");
      const store = transaction.objectStore("keys");
      const request = store.get("walletPrivateKey");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function encryptPrivateKey(privateKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    return {
      encryptedData: new Uint8Array(encryptedData),
      iv: iv,
      key: new Uint8Array(exportedKey)
    };
  }

  async function decryptPrivateKey(encryptedData, iv, key) {
    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      importedKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  const checkForStoredKey = async () => {
    try {
      const db = await openDatabase();
      const encryptedKey = await getEncryptedKey(db);
      setHasStoredKey(!!encryptedKey);
    } catch (error) {
      console.log('Error checking for stored key:', error.message);
    }
  }

  useEffect(() => {
    checkForStoredKey();
  }, []);

  const deposit = async () => {
    try {
      if (account) {
        await navigator.clipboard.writeText(account);
        alert(`Address copied to clipboard: ${account}`);
      } else {
        alert("No account connected");
      }
    } catch (error) {
      console.log("Error copying address:", error.message);
      alert("Failed to copy address. Please try again.");
    }
  };

  const withdraw = async () => {
    try {
      const db = await openDatabase();
      const encryptedKey = await getEncryptedKey(db);
      if (!encryptedKey) {
        alert("No stored wallet found. Please create an account first.");
        return;
      }
      const privateKey = await decryptPrivateKey(encryptedKey.encryptedData, encryptedKey.iv, encryptedKey.key);
      const provider = new ethers.InfuraProvider(network);
      const wallet = new ethers.Wallet(privateKey, provider);
      const recipientAddress = prompt("Enter the recipient's Ethereum address:");
      if (!ethers.isAddress(recipientAddress)) {
        alert("Invalid Ethereum address");
        return;
      }
      const amount = prompt("Enter the amount of ETH to send:");
      const amountInWei = ethers.parseEther(amount);
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: amountInWei
      });
      alert(`Transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      alert("Transaction confirmed!");
      await fetchBalance(account, provider);
    } catch (error) {
      console.log("Withdrawal error:", error.message);
      alert("Withdrawal failed. Please try again.");
    }
  };

  const getPrivateKey = async () => {
    try {
      const db = await openDatabase();
      const encryptedKey = await getEncryptedKey(db);
      if (!encryptedKey) {
        alert("No stored wallet found. Please create an account first.");
        return;
      }
      const privateKey = await decryptPrivateKey(encryptedKey.encryptedData, encryptedKey.iv, encryptedKey.key);
      await navigator.clipboard.writeText(privateKey);
      alert("Private key copied to clipboard. Keep it secret and safe!");
    } catch (error) {
      console.log("Error exporting private key:", error.message);
      alert("Failed to export private key. Please try again.");
    }
  };

  const importAccount = async () => {
    try {
      const privateKey = prompt("Please enter your private key:");
      if (!privateKey || !(privateKey.length === 64 || (privateKey.length === 66 && privateKey.startsWith('0x')))) {
        alert("Invalid private key. Please try again.");
        return;
      }
      const provider = new ethers.InfuraProvider(network);
      const wallet = new ethers.Wallet(privateKey, provider);
      const encryptedData = await encryptPrivateKey(privateKey);
      const db = await openDatabase();
      await storeEncryptedKey(db, encryptedData);
      setAccount(wallet.address);
      setConnected(true);
      setHasStoredKey(true);
      await fetchBalance(wallet.address, provider);
      alert("Account imported successfully!");
    } catch (error) {
      console.log("Error importing account:", error.message);
      alert("Failed to import account. Please check your private key and try again.");
    }
  };

  const switchNetwork = async (newNetwork) => {
    try {
      const networkDetails = {
        Ethereum: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3/1c82f1b29a7b47ce900cb947eb402f54',
        },
        Sepolia: {
          chainId: '0xaa36a7',
          rpcUrl: 'https://sepolia.infura.io/v3/1c82f1b29a7b47ce900cb947eb402f54',
        },
        Optimism: {
          chainId: '0xa',
          rpcUrl: 'https://optimism-mainnet.infura.io/v3/1c82f1b29a7b47ce900cb947eb402f54',
        },
      };
      setNetwork(newNetwork);
      alert(`Switched to ${newNetwork} network!`);
    } catch (error) {
      console.log("Error switching network:", error.message);
      alert("Failed to switch network. Please try again.");
    }
  };
  

  return (
    <div className="App">
      <h1>Bank of Ethereum</h1>
      <img className='logo' src={Logo} alt='logo'/>
      <select className='network' onChange={(e) => switchNetwork(e.target.value)}>
        <option value="mainnet">Ethereum</option>
        <option value="sepolia" selected>Sepolia</option>
        <option value="optimism">Optimism</option>
      </select>

      {!connected && (
        <>
          <button
            className='account'
            onClick={connect}>
            Login
          </button>
          {!hasStoredKey && (
            <div className='login'>
              <button onClick={createAccount}>Create Account</button>
              <button onClick={importAccount}>Import Account</button>
            </div>
          )}
        </>
      )
      }

      {connected && (
        <>
          <button
            className='account'
            onClick={disconnect}>
            {account.substr(0, 6) + "..."}
          </button>
          <p className='balance'>Balance: {Number(ethers.formatEther(balance)).toFixed(4)} ETH</p>

          <div className='buttons'>
            <button onClick={deposit}>Deposit</button>
            <button onClick={withdraw}>Withdraw</button>
          </div>

          <div className='footer'>
            <button onClick={deleteAccount}>Delete Account</button>
            <button onClick={getPrivateKey}>Export Keys</button>
          </div>
        </>
      )}

    </div>
  );
}

export default App;
