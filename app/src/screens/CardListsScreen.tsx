import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native";
import { getListings, addListing, removeListing, searchCards } from "../api";
import { CardListing, CardSummary, ListType } from "../types";
import { formatCardPrice } from "../format";
import { colors } from "../theme";

export function CardListsScreen() {
  const [listType, setListType] = useState<ListType>("want");
  const [listings, setListings] = useState<CardListing[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingCard, setViewingCard] = useState<CardListing | null>(null);

  const loadListings = useCallback(async () => {
    const rows = await getListings(listType);
    setListings(rows);
  }, [listType]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchCards(query.trim());
      setResults(found);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (card: CardSummary) => {
    setError(null);
    try {
      await addListing(card.id, listType);
      setResults([]);
      setQuery("");
      await loadListings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemove = async (id: number) => {
    await removeListing(id);
    await loadListings();
  };

  if (viewingCard) {
    return (
      <View style={styles.detailContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => setViewingCard(null)}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        {!!(viewingCard.image_url_large || viewingCard.image_url) && (
          <Image
            source={{ uri: viewingCard.image_url_large || viewingCard.image_url }}
            style={styles.detailImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.detailName}>{viewingCard.card_name}</Text>
        <Text style={styles.detailSet}>{viewingCard.set_name}</Text>
        {viewingCard.market_price != null && (
          <Text style={styles.detailPrice}>
            {formatCardPrice(viewingCard.market_price, viewingCard.market_price_currency)}
            {viewingCard.market_price_currency === "EUR" ? " (Cardmarket)" : viewingCard.market_price_currency === "USD" ? " (TCGplayer)" : ""}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, listType === "want" && styles.tabActive]} onPress={() => setListType("want")}>
          <Text style={[styles.tabText, listType === "want" && styles.tabTextActive]}>Want</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, listType === "have" && styles.tabActive]} onPress={() => setListType("have")}>
          <Text style={[styles.tabText, listType === "have" && styles.tabTextActive]}>Have</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search a card name..." onSubmitEditing={handleSearch} />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searching}>
          {searching ? <ActivityIndicator color={colors.white} /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {results.length > 0 && (
        <FlatList
          style={styles.resultsList}
          data={results}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => handleAdd(item)}>
              {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSet}>{item.setName}</Text>
              </View>
              <Text style={styles.addLabel}>+ Add</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.listHeading}>My {listType} list ({listings.length})</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => (
          <View style={styles.listingRow}>
            {!!item.image_url && (
              <TouchableOpacity onPress={() => setViewingCard(item)}>
                <Image source={{ uri: item.image_url }} style={styles.cardImage} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.card_name}</Text>
              <Text style={styles.cardSet}>{item.set_name}</Text>
              {item.market_price != null && <Text style={styles.cardPrice}>{formatCardPrice(item.market_price, item.market_price_currency)}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.id)}>
              <Text style={styles.removeLabel}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet — search above to add a card.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 50 },
  tabRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 10, backgroundColor: colors.surface, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: colors.white },
  searchRow: { flexDirection: "row", marginHorizontal: 16, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.textPrimary },
  searchButton: { backgroundColor: colors.navy, paddingHorizontal: 16, borderRadius: 8, justifyContent: "center" },
  searchButtonText: { color: colors.white, fontWeight: "600" },
  resultsList: { maxHeight: 220, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  addLabel: { color: colors.navy, fontWeight: "700" },
  listHeading: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", fontSize: 12 },
  listingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  cardImage: { width: 36, height: 50, borderRadius: 4, backgroundColor: colors.surface },
  cardName: { fontSize: 15, fontWeight: "600", color: colors.navy },
  cardSet: { fontSize: 12, color: colors.textMuted },
  cardPrice: { fontSize: 12, color: colors.textSecondary },
  removeLabel: { color: colors.error, fontWeight: "600" },
  emptyText: { marginHorizontal: 16, color: colors.textMuted, fontSize: 14 },
  error: { color: colors.error, marginHorizontal: 16, marginBottom: 8 },
  detailContainer: { flex: 1, backgroundColor: colors.white, paddingTop: 50, paddingHorizontal: 24, alignItems: "center" },
  backButton: { alignSelf: "flex-start", marginBottom: 20 },
  backButtonText: { color: colors.navy, fontWeight: "600", fontSize: 15 },
  detailImage: { width: "100%", aspectRatio: 5 / 7, marginBottom: 20 },
  detailName: { fontSize: 22, fontWeight: "800", color: colors.navy, textAlign: "center" },
  detailSet: { fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  detailPrice: { fontSize: 18, color: colors.navy, fontWeight: "600", marginTop: 12 },
});
