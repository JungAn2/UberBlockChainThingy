import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useWallet } from './WalletContext';
import SignIn from './signIn';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

export default function MainContent() {
  const { walletAddress } = useWallet();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    if (walletAddress) {
      setIsSignedIn(true);
      router.push('driver'); // Navigate to the driver screen
    }
  }, [walletAddress, router]);

  if (!isSignedIn) {
    return <SignIn />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
