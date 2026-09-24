import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getMessages, sendMessage, sendImageMessage, getTradesForMatch, confirmTrade, rateTrade, reportUser } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Message, Trade } from "../types";
import { colors } from "../theme";
import { API_BASE_URL } from "../config";

const POLL_MS = 4000;

export function ChatScreen({ matchId, otherName, otherUserId, onBack }: { matchId: number; otherName: string; otherUserId: number; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [trade, setTrade] = useState<Trade | null>(null);
  const [rated, setRated] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [review, setReview] = useState("");
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async () => {
    const result = await getMessages(matchId);
    setMessages(result);
  }, [matchId]);

  const loadTrade = useCallback(async () => {
    const trades = await getTradesForMatch(matchId);
    setTrade(trades[0] ?? null);
  }, [matchId]);

  useEffect(() => {
    loadMessages();
    loadTrade();
    const interval = setInterval(() => {
      loadMessages();
      loadTrade();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadMessages, loadTrade]);

  const handleSend = async () => {
    if (!body.trim()) return;
    const text = body.trim();
    setBody("");
    await sendMessage(matchId, text);
    await loadMessages();
  };

  const handleConfirmTrade = async () => {
    const result = await confirmTrade(matchId);
    setTrade(result);
    if (result.completed_at) {
      Alert.alert("Trade complete", "Both of you confirmed the trade. Leave a rating below?");
    } else {
      Alert.alert("Marked as complete", "Waiting for the other person to confirm too.");
    }
  };

  const handleRate = async () => {
    if (!trade || selectedStars === 0) return;
    await rateTrade(trade.id, selectedStars, review.trim() || undefined);
    setRated(true);
  };

  const sendPickedImage = async (uri: string) => {
    setSendingImage(true);
    try {
      await sendImageMessage(matchId, uri);
      await loadMessages();
    } catch (err) {
      Alert.alert("Couldn't send photo", (err as Error).message);
    } finally {
      setSendingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) await sendPickedImage(result.assets[0].uri);
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo library access needed", "Enable photo access in Settings to share a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) await sendPickedImage(result.assets[0].uri);
  };

  const handlePickImage = () => {
    Alert.alert("Share a photo", "Let the other person inspect the card before you meet up.", [
      { text: "Take photo", onPress: handleTakePhoto },
      { text: "Choose from library", onPress: handleChooseFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) return;
    await reportUser(otherUserId, reportReason.trim());
    setReportReason("");
    setShowReportBox(false);
    Alert.alert("Reported", "Thanks — we'll review this.");
  };

  const tradeComplete = !!trade?.completed_at;
  const iConfirmed = trade && user && (trade.confirmed_by_a || trade.confirmed_by_b);

  if (viewingImageUrl) {
    return (
      <View style={styles.imageViewer}>
        <TouchableOpacity style={styles.backButton} onPress={() => setViewingImageUrl(null)}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Image source={{ uri: `${API_BASE_URL}${viewingImageUrl}` }} style={styles.fullImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>{"< Matches"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{otherName}</Text>
        <TouchableOpacity onPress={() => setShowReportBox((v) => !v)}>
          <Text style={styles.report}>Report</Text>
        </TouchableOpacity>
      </View>

      {showReportBox && (
        <View style={styles.reportBox}>
          <Text style={styles.ratingTitle}>Report {otherName}</Text>
          <TextInput
            style={styles.reviewInput}
            value={reportReason}
            onChangeText={setReportReason}
            placeholder="What's the issue? (e.g. suspected fake card, no-show)"
            multiline
          />
          <TouchableOpacity style={[styles.tradeButton, !reportReason.trim() && styles.disabled]} onPress={handleSubmitReport} disabled={!reportReason.trim()}>
            <Text style={styles.tradeButtonText}>Submit report</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_id === user?.id ? styles.bubbleMine : styles.bubbleTheirs]}>
            {item.image_url ? (
              <TouchableOpacity onPress={() => setViewingImageUrl(item.image_url)}>
                <Image source={{ uri: `${API_BASE_URL}${item.image_url}` }} style={styles.bubbleImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <Text style={item.sender_id === user?.id ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
            )}
          </View>
        )}
      />

      {!tradeComplete && (
        <TouchableOpacity style={styles.tradeButton} onPress={handleConfirmTrade}>
          <Text style={styles.tradeButtonText}>{iConfirmed ? "Waiting on the other person…" : "Mark trade complete"}</Text>
        </TouchableOpacity>
      )}

      {tradeComplete && !rated && (
        <View style={styles.ratingBox}>
          <Text style={styles.ratingTitle}>Trade complete — rate {otherName}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setSelectedStars(n)}>
                <Text style={[styles.star, n <= selectedStars && styles.starSelected]}>{"★"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.reviewInput} value={review} onChangeText={setReview} placeholder="Optional review" multiline />
          <TouchableOpacity style={[styles.tradeButton, selectedStars === 0 && styles.disabled]} onPress={handleRate} disabled={selectedStars === 0}>
            <Text style={styles.tradeButtonText}>Submit rating</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.photoButton} onPress={handlePickImage} disabled={sendingImage}>
          <Text style={styles.photoButtonText}>{sendingImage ? "…" : "📷"}</Text>
        </TouchableOpacity>
        <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Message..." onSubmitEditing={handleSend} />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.navy, fontWeight: "600" },
  headerName: { fontSize: 16, fontWeight: "700", color: colors.navy },
  report: { color: colors.error, fontWeight: "600" },
  messages: { padding: 16, gap: 8 },
  bubble: { maxWidth: "80%", padding: 10, borderRadius: 12, marginBottom: 4 },
  bubbleMine: { backgroundColor: colors.navy, alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: "flex-start" },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.navy },
  tradeButton: { backgroundColor: colors.navy, marginHorizontal: 16, marginBottom: 8, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  tradeButtonText: { color: colors.white, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  ratingBox: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: colors.surface },
  reportBox: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: colors.errorBg },
  ratingTitle: { fontWeight: "700", color: colors.navy, marginBottom: 8 },
  starsRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  star: { fontSize: 28, color: colors.border },
  starSelected: { color: colors.gold },
  reviewInput: { backgroundColor: colors.white, borderRadius: 8, padding: 10, minHeight: 44, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  sendButton: { backgroundColor: colors.navy, paddingHorizontal: 16, borderRadius: 20, justifyContent: "center" },
  sendButtonText: { color: colors.white, fontWeight: "700" },
  photoButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  photoButtonText: { fontSize: 18 },
  bubbleImage: { width: 180, height: 240, borderRadius: 8 },
  imageViewer: { flex: 1, backgroundColor: colors.white, paddingTop: 50, paddingHorizontal: 24 },
  backButton: { marginBottom: 20 },
  backButtonText: { color: colors.navy, fontWeight: "600", fontSize: 15 },
  fullImage: { flex: 1 },
});
