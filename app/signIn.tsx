import React, { useEffect } from 'react';
import { Pressable, View, Alert, StyleSheet, Text } from 'react-native';
import Web3 from 'web3';
import { useWallet } from './WalletContext';
import { useRouter } from 'expo-router';
import config from './config/config';

export default function SignIn() {
  const { walletAddress, setWalletAddress, userName, setUserName } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (walletAddress) {
      router.push('driver'); // Navigate to the driver screen
    }
  }, [walletAddress, router]);

  const handleLogin = async (user:number) => {
    try {
      // Connect to Ganache
      const web3 = new Web3(config.server);
      
      // Use a predetermined wallet address
      let walletAddress = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
      let name = 'Alice';
      
      if(user == 2){
        walletAddress = '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0';
        name = 'Bob';
      }

      // Set the wallet address to state
      setWalletAddress(walletAddress);
      setUserName(name);
      
      Alert.alert('Login Successful', `Connected to wallet: ${walletAddress}`);
      
      // Navigate to the driver tab
      router.push('driver');
    } catch (error) {
      console.error('Error connecting to Ganache:', error);
      Alert.alert('Login Failed', 'Error connecting to Ganache');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Uber BlockChain</Text>
      <View style={{ display: 'flex', flexDirection: 'row', marginBottom: 20, gap: 30 }}>
        <Pressable style={styles.button} onPress={()=>handleLogin(1)}>
          <Text>User 1</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={()=>handleLogin(2)}>
          <Text>User 2</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 50,
    fontWeight: 'black',
    marginBottom: 40,
  },
  button: {
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
  },
});