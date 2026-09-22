import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { getMatches } from "../api";
import { MatchSummary } from "../types";

export function MatchesScreen({ onOpenChat }: { onOpenChat: (matchId: number, otherName: string, otherUserId: number) => void }) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await getMatches();
    setMatches(result);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyBody}>Like someone in Discover — if they like you back, you'll match and can chat here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(m) => String(m.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => onOpenChat(item.id, item.otherUser.displayName, item.otherUser.id)}>
          <Text style={styles.rowName}>{item.otherUser.displayName}</Text>
          <Text style={styles.rowMessage} numberOfLines={1}>
            {item.lastMessage?.body ?? "Say hello — suggest a time and place to meet up."}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", textAlign: "center" },
  emptyBody: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8 },
  row: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  rowMessage: { fontSize: 14, color: "#666", marginTop: 4 },
});
