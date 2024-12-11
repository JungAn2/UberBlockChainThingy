import React from 'react';
import { WalletProvider } from './WalletContext';
import { Slot } from 'expo-router'; // Import the Slot component for rendering routes
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <WalletProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* The Slot component is where the pages will be rendered */}
        <Slot />
      </ThemeProvider>
    </WalletProvider>
  );
}