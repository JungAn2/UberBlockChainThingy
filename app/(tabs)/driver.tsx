import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
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
  // const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const walletAddress = useWallet().walletAddress;
  const user = useWallet().userName;

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
                  web3.eth.abi.encodeFunctionSignature(func as any) ===
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
                      ride.push({ tx, rideDetails: curr });
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

  useEffect(() => {
    fetchRides();
  }, []);

  const handleAcceptRide = async (tx: any) => {
    try {
      for (let i = 0; i < rides.length; i++) {
        if (
          (rides[i].rideDetails.status === "Accepted" ||
            rides[i].rideDetails.status === "InProgress") &&
          rides[i].rideDetails.driverWallet === walletAddress
        ) {
          Alert.alert(
            "Error",
            "You have already accepted a ride. Please complete the current ride before accepting another."
          );
          return;
        }
      }
      const contractAddress = tx.to;
      if (contractAddress) {
        const deployedContract = new web3.eth.Contract(
          contractABI,
          contractAddress
        );
        await deployedContract.methods.acceptRide(user, walletAddress).send({
          from: tx.from,
          gas: "200000", // Increase the gas limit
          gasPrice: "20000000000",
        });
        const randomNumber = Math.floor(Math.random() * 9000) + 1000;
        await deployedContract.methods
          .startRide(randomNumber, walletAddress)
          .send({
            from: tx.from,
            gas: "200000", // Increase the gas limit
            gasPrice: "20000000000",
          });
        fetchRides();
        Alert.alert(
          "Ride Accepted",
          "You have successfully accepted the ride."
        );
      }
    } catch (error) {
      console.error("Error accepting ride:", error);
      setError("Error accepting ride. Please try again later.");
    }
  };
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
            ride.rideDetails.status === "Accepted" ||
            ride.rideDetails.status === "InProgress" ? (
              <View key={index} style={styles.transaction}>
                {Object.entries(ride.rideDetails).map(([key, value]) => (
                  <Text key={key}>{`${key}: ${value}`}</Text>
                ))}
                {(ride.rideDetails.status === "Accepted" ||
                  ride.rideDetails.status === "InProgress") && (
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

                        await deployedContract.methods.driverCancelRide().send({
                          from: account,
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
                {ride.rideDetails.status === "InProgress" && (
                  <Button
                    title="Complete Ride"
                    onPress={async () => {
                      try {
                        const accounts = await web3.eth.getAccounts();
                        const account = accounts[0];
                        const deployedContract = new web3.eth.Contract(
                          contractABI,
                          ride.tx.to
                        );

                        await deployedContract.methods
                          .completeRide(walletAddress)
                          .send({
                            from: account,
                          });

                        Alert.alert(
                          "Ride Completed",
                          "Your ride has been completed."
                        );
                        fetchRides(); // Refresh the rides list
                      } catch (error) {
                        console.error("Error completing ride:", error);
                        setError(
                          "Error completing ride. Please try again later."
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
      <Button title="Fetch Transactions" onPress={fetchRides} />
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={rides.filter((ride) => ride.rideDetails.status === "Pending")}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            {Object.entries(item.rideDetails).map(([key, value]) => (
              <Text key={key}>{`${key}: ${value}`}</Text>
            ))}
            <Button
              title="Accept Ride"
              onPress={() => handleAcceptRide(item.tx)}
            />
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
