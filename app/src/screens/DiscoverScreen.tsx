import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Image } from "react-native";
import { getCandidates, swipe } from "../api";
import { Candidate } from "../types";
import { formatCardPrice } from "../format";
import { colors } from "../theme";

export function DiscoverScreen({
  onMatched,
  onViewProfile,
}: {
  onMatched: (matchId: number) => void;
  onViewProfile: (userId: number) => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCandidates();
      setCandidates(result);
      setIndex(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = candidates[index];

  const handleSwipe = async (direction: "like" | "pass") => {
    if (!current || swiping) return;
    setSwiping(true);
    try {
      const result = await swipe(current.user.id, direction);
      if (result.matched && result.matchId) {
        onMatched(result.matchId);
      }
      setIndex((i) => i + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSwiping(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No one new nearby right now</Text>
        <Text style={styles.emptyBody}>Add more cards to your have/want lists, or widen your radius in Profile.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Check again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.card} contentContainerStyle={{ paddingBottom: 24 }}>
        {current.mutual && <View style={styles.mutualBadge}><Text style={styles.mutualBadgeText}>Mutual interest</Text></View>}
        <Text style={styles.name}>{current.user.display_name}</Text>
        <Text style={styles.distance}>{current.distanceMiles} miles away</Text>
        {current.user.bio && <Text style={styles.bio}>{current.user.bio}</Text>}
        <TouchableOpacity onPress={() => onViewProfile(current.user.id)}>
          <Text style={styles.profileLink}>View full profile & rating</Text>
        </TouchableOpacity>

        {current.theyHaveIWant.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>They have, you want</Text>
            {current.theyHaveIWant.map((c) => (
              <View key={c.cardId} style={styles.cardRow}>
                {!!c.imageUrl && <Image source={{ uri: c.imageUrl }} style={styles.cardImage} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{c.cardName}</Text>
                  {c.marketPrice != null && <Text style={styles.cardPrice}>{formatCardPrice(c.marketPrice, c.marketPriceCurrency)}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {current.theyWantIHave.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>They want, you have</Text>
            {current.theyWantIHave.map((c) => (
              <View key={c.cardId} style={styles.cardRow}>
                {!!c.imageUrl && <Image source={{ uri: c.imageUrl }} style={styles.cardImage} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{c.cardName}</Text>
                  {c.marketPrice != null && <Text style={styles.cardPrice}>{formatCardPrice(c.marketPrice, c.marketPriceCurrency)}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={() => handleSwipe("pass")} disabled={swiping}>
          <Text style={styles.actionButtonText}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleSwipe("like")} disabled={swiping}>
          <Text style={styles.likeButtonText}>Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { flex: 1, padding: 20 },
  mutualBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  mutualBadgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "800", color: colors.navy },
  distance: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  bio: { fontSize: 14, color: colors.textPrimary, marginTop: 12 },
  profileLink: { fontSize: 13, color: colors.navy, fontWeight: "600", textDecorationLine: "underline", marginTop: 10 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  cardImage: { width: 40, height: 56, borderRadius: 4, backgroundColor: colors.surface },
  cardName: { fontSize: 15, fontWeight: "600", color: colors.navy },
  cardPrice: { fontSize: 13, color: colors.textSecondary },
  actionRow: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  passButton: { backgroundColor: colors.surface },
  likeButton: { backgroundColor: colors.gold },
  actionButtonText: { fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  likeButtonText: { fontSize: 16, fontWeight: "700", color: colors.navy },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.navy, textAlign: "center" },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 8 },
  retryButton: { marginTop: 20, backgroundColor: colors.navy, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: colors.white, fontWeight: "600" },
  error: { color: colors.error, textAlign: "center" },
});
