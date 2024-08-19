import { useState } from 'react';
import { ethers } from 'ethers'
import * as Keychain from 'react-native-keychain';

function App() {

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState()

  const connect = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const message = "Sign into the Bank of Ethereum?"
      const sig = await signer.signMessage(message);
      const verify = ethers.verifyMessage(message, sig)
      if (verify === address) {
        setConnected(true)
        setAccount(address)
      }
    } catch(error) {
      console.log(error.message)
    }
  }

  const disconnect = async () => {
    try {
      setConnected(false)
    } catch(error) {
      console.log(error.message)
    }
  }

  const createAccount = async () => {
    try {
      const provider = new ethers.InfuraProvider('mainnet');
      const wallet = ethers.Wallet.createRandom(provider);
      
      // Store the private key in the keychain
      await Keychain.setGenericPassword('walletPrivateKey', wallet.privateKey);
      
      console.log('Wallet created and private key stored in keychain');
      setAccount(wallet.address);
      setConnected(true);
    } catch(error) {
      console.log(error.message);
    }
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
