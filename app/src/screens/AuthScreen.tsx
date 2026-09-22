import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator } from "react-native";
import { requestCode, register, login } from "../api";
import { useAuth } from "../auth/AuthContext";

type Mode = "signup" | "login";

export function AuthScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("15");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSendCode = mode === "login" ? !!email : !!email && !!displayName && !!postcode;

  const handleSendCode = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await requestCode(email.trim().toLowerCase());
      setCodeSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        const { token, user } = await login(normalizedEmail, code.trim());
        await signIn(token, user);
      } else {
        const { token, user } = await register({
          email: normalizedEmail,
          code: code.trim(),
          displayName: displayName.trim(),
          postcode: postcode.trim(),
          radiusMiles: Number(radiusMiles) || 15,
        });
        await signIn(token, user);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>localpoketrades</Text>
      <Text style={styles.subtitle}>Find local collectors with the cards you want.</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeButton, mode === "signup" && styles.modeButtonActive]}
          onPress={() => {
            setMode("signup");
            setCodeSent(false);
            setError(null);
          }}
        >
          <Text style={[styles.modeButtonText, mode === "signup" && styles.modeButtonTextActive]}>Sign up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
          onPress={() => {
            setMode("login");
            setCodeSent(false);
            setError(null);
          }}
        >
          <Text style={[styles.modeButtonText, mode === "login" && styles.modeButtonTextActive]}>Log in</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" editable={!codeSent} />

      {mode === "signup" && (
        <>
          <Text style={styles.label}>Display name</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Alex" editable={!codeSent} />

          <Text style={styles.label}>Postcode</Text>
          <TextInput style={styles.input} value={postcode} onChangeText={setPostcode} placeholder="SW1A 1AA" autoCapitalize="characters" editable={!codeSent} />
          <Text style={styles.hint}>Used to find nearby traders — never shown to other users precisely.</Text>

          <Text style={styles.label}>Trade radius (miles)</Text>
          <TextInput style={styles.input} value={radiusMiles} onChangeText={setRadiusMiles} keyboardType="number-pad" editable={!codeSent} />
        </>
      )}

      {!codeSent ? (
        <TouchableOpacity style={[styles.primaryButton, (!canSendCode || submitting) && styles.disabled]} onPress={handleSendCode} disabled={!canSendCode || submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send code</Text>}
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.label}>Code</Text>
          <Text style={styles.hint}>Check the backend logs — email delivery is stubbed in dev.</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" />

          <TouchableOpacity style={[styles.primaryButton, (!code || submitting) && styles.disabled]} onPress={handleSubmit} disabled={!code || submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === "signup" ? "Create account" : "Log in"}</Text>}
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6, marginBottom: 24 },
  modeRow: { flexDirection: "row", marginBottom: 20, borderRadius: 10, backgroundColor: "#f0f0f3", padding: 4 },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#1a1a2e" },
  modeButtonText: { color: "#666", fontWeight: "600" },
  modeButtonTextActive: { color: "#fff" },
  label: { fontSize: 13, color: "#666", marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 12, color: "#999", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 15 },
  primaryButton: { backgroundColor: "#1a1a2e", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  error: { color: "#c0392b", marginTop: 16, textAlign: "center" },
});
