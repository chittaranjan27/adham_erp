import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileProvider } from "@/context/ProfileContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: true,
          headerTitle: "Order Details",
          headerStyle: { backgroundColor: "#1A1F2E" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="dispatch/[id]"
        options={{
          headerShown: true,
          headerTitle: "Dispatch Details",
          headerStyle: { backgroundColor: "#1A1F2E" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="inventory/[id]"
        options={{
          headerShown: true,
          headerTitle: "Inventory Item",
          headerStyle: { backgroundColor: "#1A1F2E" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
          presentation: "card",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ProfileProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </ProfileProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
