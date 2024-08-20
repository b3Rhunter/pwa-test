import { useState } from 'react';
import { ethers } from 'ethers'

function App() {

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState()

  const connect = async () => {
    try {
      const db = await openDatabase();
      const encryptedKey = await getEncryptedKey(db);
      
      if (encryptedKey) {
        const privateKey = await decryptPrivateKey(encryptedKey.encryptedData, encryptedKey.iv, encryptedKey.key);
        const provider = new ethers.InfuraProvider('mainnet');
        const wallet = new ethers.Wallet(privateKey, provider);
        const address = await wallet.getAddress();
        setConnected(true);
        setAccount(address);
      } else {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setConnected(true);
        setAccount(address);
      }
    } catch(error) {
      console.log(error.message);
    }
  }

  const disconnect = async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(["keys"], "readwrite");
      const store = transaction.objectStore("keys");
      await store.delete("walletPrivateKey");
      setConnected(false);
      setAccount(null);
    } catch(error) {
      console.log(error.message);
    }
  }

  const createAccount = async () => {
    try {
      const provider = new ethers.InfuraProvider('mainnet');
      const wallet = ethers.Wallet.createRandom(provider);
      
      const encryptedData = await encryptPrivateKey(wallet.privateKey);
      
      const db = await openDatabase();
      await storeEncryptedKey(db, encryptedData);
      
      console.log('Wallet created and private key stored securely');
      setAccount(wallet.address);
      setConnected(true);
    } catch(error) {
      console.log(error.message);
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

  return (
    <div className="App">

      <h1>Bank of Ethereum</h1>

      <button onClick={createAccount}>create account</button>

      {!connected && 
        <button 
          className='account' 
          onClick={connect}>
           Login
        </button>
      }

      {connected && (
        <>
        <button 
          className='account' 
          onClick={disconnect}>
            {account.substr(0, 6) + "..."}
          </button>
        </>
      )}

    </div>
  );
}

export default App;
