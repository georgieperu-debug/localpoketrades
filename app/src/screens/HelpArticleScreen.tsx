import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { getHelpArticle } from "../api";
import { HelpArticle } from "../types";

export function HelpArticleScreen({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [article, setArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    getHelpArticle(slug).then(setArticle);
  }, [slug]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>{"< Back"}</Text>
      </TouchableOpacity>
      {!article ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a1a2e" />
      ) : (
        <>
          <Text style={styles.title}>{article.title}</Text>
          {article.body.map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 24, paddingBottom: 40 },
  back: { color: "#1a1a2e", fontWeight: "600", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a2e", marginBottom: 16 },
  paragraph: { fontSize: 15, color: "#333", lineHeight: 22, marginBottom: 14 },
});
