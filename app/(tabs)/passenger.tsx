import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Alert, FlatList } from "react-native";
import Web3 from "web3";
import config from "../config/config"; // Ensure you have a config file with your Ethereum node URL
import { useContext } from "react";
import { useWallet } from "../WalletContext";
import SignOut from "../signOut";

const web3 = new Web3(new Web3.providers.HttpProvider(config.server)); // Connect to your Ethereum node
const contractABI = config.ridesABI; // Your contract's ABI
const contractBytecode = config.ridesBIN; // Your contract's bytecode

export default function Passenger() {
  const status = [
    "Pending",
    "Accepted",
    "InProgress",
    "Completed",
    "Cancelled",
  ];
  const walletAddress = useWallet().walletAddress;
  const user = useWallet().userName;
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = async () => {
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      const usedContract: any[] = [];
      const ride: any[] = [];
      for (let i = latestBlock; i >= 0 && rides.length < 100; i--) {
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
                if (!usedContract.includes(contractAddress)) {
                  usedContract.push(contractAddress);
                  if (contractAddress) {
                    const deployedContract = new web3.eth.Contract(
                      contractABI,
                      contractAddress
                    );
                    const rideDetails = await deployedContract.methods
                      .getRideDetails()
                      .call();
                    if (rideDetails) {
                      const curr: any = {
                        driverWallet: rideDetails[0],
                        passengerWallet: rideDetails[1],
                        fare: rideDetails[2],
                        status: status[rideDetails[3]],
                        startTime: rideDetails[4],
                        endTime: rideDetails[5],
                        cancellationFee: rideDetails[6],
                        distance: rideDetails[7],
                      };
                      console.log(curr.passengerWallet, walletAddress);
                      if (curr.passengerWallet === walletAddress) {
                        ride.push({ tx, rideDetails: curr });
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }
      setRides(ride);
      Alert.alert("Rides Fetched", `Fetched ${rides.length} rides.`);
    } catch (error) {
      console.error("Error fetching rides:", error);
      setError("Error fetching rides. Please try again later.");
    }
  };

  const deployContract = async () => {
    for (let i = 0; i < rides.length; i++) {
      if (
        rides[i].rideDetails.status === "Pending" &&
        rides[i].rideDetails.passengerWallet === walletAddress
      ) {
        Alert.alert("Error", "You already have a requested ride.");
        return;
      }
    }
    try {
      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      const contract = new web3.eth.Contract(contractABI);

      const deployedContract = await contract
        .deploy({
          data: contractBytecode,
        })
        .send({
          from: account,
          gas: "1500000",
          gasPrice: "30000000000000",
        });

      const fare = Math.floor(Math.random() * 100) + 1; // Generate a random fare between 1 and 100
      // Call the requestRide function after deploying the contract
      await deployedContract.methods
        .requestRide(fare, user, walletAddress)
        .send({
          from: account,
          gas: "500000",
          gasPrice: "20000000000",
        });

      Alert.alert(
        "Contract Deployed",
        `Contract deployed at address: ${deployedContract.options.address}`
      );
      fetchRides(); // Refresh the rides list
    } catch (error) {
      console.error("Error deploying contract:", error);
      setError("Error deploying contract. Please try again later.");
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text>Wallet Address:</Text>
        <Text>{walletAddress}</Text>
        <Text style={{ fontWeight: "bold" }}>{user}</Text>
        <SignOut />
      </View>
      <View style={styles.currentRide}>
        <Text style={{ fontWeight: "bold" }}>Current Ride:</Text>
        {rides.length > 0 ? (
          rides.map((ride, index) =>
            (ride.rideDetails.status === "Pending" ||
              ride.rideDetails.status === "Accepted" ||
              ride.rideDetails.status === "InProgress") &&
            ride.rideDetails.passengerWallet === walletAddress ? (
              <View key={index} style={styles.transaction}>
                {Object.entries(ride.rideDetails).map(([key, value]) => (
                  <Text key={key}>{`${key}: ${value}`}</Text>
                ))}
                {ride.rideDetails.status !== "Completed" && ride.rideDetails.status !== "Cancelled" && ride.rideDetails.status != "InProgress" && (
                  <Button
                    title="Cancel Ride"
                    onPress={async () => {
                      try {
                        const accounts = await web3.eth.getAccounts();
                        const account = accounts[0];
                        const deployedContract = new web3.eth.Contract(
                          contractABI,
                          ride.tx.to
                        );

                        await deployedContract.methods.passengerCancelRide().send({
                          from: account
                        });

                        Alert.alert(
                          "Ride Cancelled",
                          "Your ride has been cancelled."
                        );
                        fetchRides(); // Refresh the rides list
                      } catch (error) {
                        console.error("Error cancelling ride:", error);
                        setError(
                          "Error cancelling ride. Please try again later."
                        );
                      }
                    }}
                  />
                )}
              </View>
            ) : null
          )
        ) : (
          <Text>No current ride found.</Text>
        )}
      </View>
      {contractAddress && <Text>Contract Address: {contractAddress}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Request Ride" onPress={deployContract} />
      <Button title="Fetch Rides" onPress={fetchRides} />
      <FlatList
        data={rides}
        keyExtractor={(item) => item.tx.hash}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            {Object.entries(item.rideDetails).map(([key, value]) => (
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
  transaction: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  currentRide: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
});