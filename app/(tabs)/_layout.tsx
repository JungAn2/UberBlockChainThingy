import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs initialRouteName="driver">
      <Tabs.Screen name="driver" options={{title: "Driver"}}/>
      <Tabs.Screen name="passenger" options={{title: "Passenger"}}/>
      <Tabs.Screen name="allRides" options={{title: "All Rides"}}/>
    </Tabs>
  );
}