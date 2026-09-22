import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api";
import { HelpArticleScreen } from "./HelpArticleScreen";

export function ProfileScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [postcode, setPostcode] = useState(user?.postcode ?? "");
  const [radiusMiles, setRadiusMiles] = useState(String(user?.radiusMiles ?? 15));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (showHelp) {
    return <HelpArticleScreen slug="spotting-fake-cards" onBack={() => setShowHelp(false)} />;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMe({ displayName: displayName.trim(), bio: bio.trim(), postcode: postcode.trim(), radiusMiles: Number(radiusMiles) || 15 });
      await refreshUser();
      Alert.alert("Saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} multiline placeholder="What are you into collecting?" />

      <Text style={styles.label}>Postcode</Text>
      <TextInput style={styles.input} value={postcode} onChangeText={setPostcode} autoCapitalize="characters" />

      <Text style={styles.label}>Trade radius (miles)</Text>
      <TextInput style={styles.input} value={radiusMiles} onChangeText={setRadiusMiles} keyboardType="number-pad" />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save changes"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.helpLink} onPress={() => setShowHelp(true)}>
        <Text style={styles.helpLinkText}>How to spot a fake card</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a2e", marginBottom: 20 },
  label: { fontSize: 13, color: "#666", marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#c0392b", marginTop: 12 },
  saveButton: { backgroundColor: "#1a1a2e", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  helpLink: { marginTop: 20, alignItems: "center" },
  helpLinkText: { color: "#1a1a2e", fontWeight: "600", textDecorationLine: "underline" },
  signOutButton: { marginTop: 32, alignItems: "center" },
  signOutButtonText: { color: "#c0392b", fontWeight: "600" },
});
