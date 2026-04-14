import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Orders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={{ default: "cube", selected: "cube.fill" }} />
        <Label>Inventory</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dispatch">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Dispatch</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.white,
          borderTopWidth: 0,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: Colors.white,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                },
              ]}
            />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dispatch"
        options={{
          title: "Dispatch",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
