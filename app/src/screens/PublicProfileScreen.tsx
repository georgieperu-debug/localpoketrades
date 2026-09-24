import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { getPublicUser } from "../api";
import { PublicUser, OverlapCard } from "../types";
import { formatCardPrice } from "../format";
import { colors } from "../theme";

function CardRow({ card }: { card: OverlapCard }) {
  return (
    <View style={styles.cardRow}>
      {!!card.imageUrl && <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{card.cardName}</Text>
        {card.marketPrice != null && <Text style={styles.cardPrice}>{formatCardPrice(card.marketPrice, card.marketPriceCurrency)}</Text>}
      </View>
    </View>
  );
}

export function PublicProfileScreen({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicUser(userId)
      .then(setProfile)
      .catch((err) => setError((err as Error).message));
  }, [userId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>{"< Back"}</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {!profile && !error && <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />}

      {profile && (
        <>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.rating}>
            {profile.ratingCount > 0
              ? `${"★".repeat(Math.round(profile.ratingAverage ?? 0))}${"☆".repeat(5 - Math.round(profile.ratingAverage ?? 0))} (${profile.ratingCount} trade${profile.ratingCount === 1 ? "" : "s"})`
              : "No ratings yet"}
          </Text>
          {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <Text style={styles.sectionTitle}>Want ({profile.wantList.length})</Text>
          {profile.wantList.length === 0 ? (
            <Text style={styles.emptyText}>Nothing on their want list yet.</Text>
          ) : (
            profile.wantList.map((c) => <CardRow key={c.cardId} card={c} />)
          )}

          <Text style={styles.sectionTitle}>Have ({profile.haveList.length})</Text>
          {profile.haveList.length === 0 ? (
            <Text style={styles.emptyText}>Nothing on their have list yet.</Text>
          ) : (
            profile.haveList.map((c) => <CardRow key={c.cardId} card={c} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.white, paddingTop: 50, paddingHorizontal: 24, paddingBottom: 40 },
  back: { color: colors.navy, fontWeight: "600", marginBottom: 16 },
  error: { color: colors.error, marginTop: 12 },
  name: { fontSize: 24, fontWeight: "800", color: colors.navy },
  rating: { fontSize: 15, color: colors.gold, marginTop: 4, fontWeight: "600" },
  bio: { fontSize: 14, color: colors.textPrimary, marginTop: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardImage: { width: 36, height: 50, borderRadius: 4, backgroundColor: colors.surface },
  cardName: { fontSize: 15, fontWeight: "600", color: colors.navy },
  cardPrice: { fontSize: 12, color: colors.textSecondary },
});
