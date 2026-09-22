import React, { useState } from "react";
import { SafeAreaView, StatusBar, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { MatchesScreen } from "./src/screens/MatchesScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { CardListsScreen } from "./src/screens/CardListsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

type Tab = "discover" | "matches" | "cards" | "profile";
type Route = { screen: "tabs" } | { screen: "chat"; matchId: number; otherName: string; otherUserId: number };

const TABS: { key: Tab; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "matches", label: "Matches" },
  { key: "cards", label: "Cards" },
  { key: "profile", label: "Profile" },
];

function MainApp() {
  const [tab, setTab] = useState<Tab>("discover");
  const [route, setRoute] = useState<Route>({ screen: "tabs" });

  if (route.screen === "chat") {
    return (
      <ChatScreen
        matchId={route.matchId}
        otherName={route.otherName}
        otherUserId={route.otherUserId}
        onBack={() => setRoute({ screen: "tabs" })}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === "discover" && <DiscoverScreen onMatched={(matchId) => setTab("matches")} />}
        {tab === "matches" && (
          <MatchesScreen
            onOpenChat={(matchId, otherName, otherUserId) => setRoute({ screen: "chat", matchId, otherName, otherUserId })}
          />
        )}
        {tab === "cards" && <CardListsScreen />}
        {tab === "profile" && <ProfileScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  return user ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eee", paddingBottom: 8, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: "center" },
  tabLabel: { fontSize: 13, color: "#999", fontWeight: "600" },
  tabLabelActive: { color: "#1a1a2e" },
});
