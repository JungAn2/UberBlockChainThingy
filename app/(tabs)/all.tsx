import "react-native-get-random-values";
import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Button, Alert } from "react-native";
import Web3 from "web3";
import config from "../config/config"; // Ensure you have a config file with your Ethereum node URL
import { useWallet } from "../WalletContext";
import SignOut from "../signOut";

const web3 = new Web3(new Web3.providers.HttpProvider(config.server)); // Connect to your Ethereum node
const contractABI = config.ridesABI; // Your contract's ABI

export default function Driver() {
  const status = [
    "Pending",
    "Accepted",
    "InProgress",
    "Completed",
    "Cancelled",
  ];
    const [rideInformation, setRideInformation] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const walletAddress = useWallet().walletAddress;
    const user = useWallet().userName;

    const fetchTransactions = async () => {
        try {
          const latestBlock = await web3.eth.getBlockNumber();
    
          const txs: Web3.Transaction[] = [];
          const rides: any[] = [];
          const usedContracts: string[] = [];
          for (let i = latestBlock; i >= 0 && txs.length < 100; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions) {
              block.transactions.forEach(async (tx) => {
                if (typeof tx !== "string" && tx.input && tx.input !== "0x") {
                  const functionSignature = tx.input.slice(0, 10);
                  const matchingFunction = contractABI.find(
                    (func) =>
                      func.type === "function" &&
                      web3.eth.abi.encodeFunctionSignature(func) ===
                        functionSignature
                  );
                  if (matchingFunction) {
                    const contractAddress = tx.to;
                    if (contractAddress && !usedContracts.includes(contractAddress)) {
                      usedContracts.push(contractAddress);
                      const deployedContract = new web3.eth.Contract(
                        contractABI,
                        contractAddress
                      );
                      const rideDetails = await deployedContract.methods
                        .getRideDetails()
                        .call();
                      
                      if (rideDetails) {
                        
                        const curr: any = {driverWallet: rideDetails[0], passengerWallet: rideDetails[1], fare: rideDetails[2], status: status[rideDetails[3]], startTime: rideDetails[4], endTime: rideDetails[5], cancellationFee: rideDetails[6], distance: rideDetails[7]};
                        rides.push(curr);
                        txs.push(tx);
                      }
                    }
                  }
                }
              });
            }
          }
          setRideInformation(rides);
    
          Alert.alert(
            "Transactions Fetched",
            `Fetched ${txs.length} transactions.`
          );
        } catch (error) {
          console.error("Error fetching transactions:", error);
          setError("Error fetching transactions. Please try again later.");
        }
      };

      return (
        <View style={styles.container}>
          <View style={styles.top}>
            <Text>Wallet Address:</Text>
            <Text>{walletAddress}</Text>
            <Text style={{fontWeight: 'bold'}}>{user}</Text>
            <SignOut />
        </View>
          <Button title="Fetch All Contracts" onPress={fetchTransactions} />
          {error && <Text style={styles.error}>{error}</Text>}
          <FlatList
            data={rideInformation}
            keyExtractor={(item) => item.tx}
            renderItem={({ item }) => (
            <View style={styles.transaction}>
                {Object.entries(item).map(([key, value]) => (
                <Text key={key}>{`${key}: ${value}`}</Text>
                ))}
            </View>
            )}
            />
        </View>
      );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    top: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
      },
    title: {
        fontSize: 50,
        fontWeight: "black",
        marginBottom: 40,
    },
    row: {
        marginBottom: 20,
    },
    error: {
        color: "red",
    },
    transaction: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
});