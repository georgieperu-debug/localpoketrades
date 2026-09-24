import React, { useState } from "react";
import { SafeAreaView, StatusBar, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { MatchesScreen } from "./src/screens/MatchesScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { CardListsScreen } from "./src/screens/CardListsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme";

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
            <View style={[styles.tabIndicator, tab === t.key && styles.tabIndicatorActive]} />
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
        <ActivityIndicator size="large" color={colors.navy} />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  tabLabelActive: { color: colors.navy },
  tabIndicator: { height: 3, width: 20, borderRadius: 2, marginTop: 6, backgroundColor: "transparent" },
  tabIndicatorActive: { backgroundColor: colors.gold },
});
