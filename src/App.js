import { useState } from 'react';
import { ethers } from 'ethers'

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

  return (
    <div className="App">
      
      <h1>Bank of Ethereum</h1>

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
