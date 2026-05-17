import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { GROQ_KEY_STORAGE } from "@/lib/groq";

const FEATURES = [
  { icon: "search-outline" as const, label: "Analiza con preguntas de IA" },
  { icon: "flash-outline" as const, label: "Potencia y estructura tu idea" },
  { icon: "grid-outline" as const, label: "Kanban interactivo" },
  { icon: "camera-outline" as const, label: "Bitácora visual de avances" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInAsGuest, user } = useAuth();
  const colorScheme = useColorScheme();
  const [groqKey, setGroqKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/(tabs)");
    AsyncStorage.getItem(GROQ_KEY_STORAGE).then((k) => {
      if (k) setGroqKey(k);
    });
  }, [user]);

  const handleSaveKey = async () => {
    if (groqKey.trim()) {
      await AsyncStorage.setItem(GROQ_KEY_STORAGE, groqKey.trim());
    } else {
      await AsyncStorage.removeItem(GROQ_KEY_STORAGE);
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleGuest = async () => {
    setLoading(true);
    await signInAsGuest();
    router.replace("/(tabs)");
  };

  const isDark = colorScheme === "dark";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#101216" : "#667eea",
    },
    gradient: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 32,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
      elevation: 12,
    },
    logo: {
      width: 80,
      height: 80,
      alignSelf: "center",
      marginBottom: 16,
      borderRadius: 20,
    },
    title: {
      fontSize: 34,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      textAlign: "center",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginBottom: 24,
    },
    featuresContainer: {
      gap: 10,
      marginBottom: 24,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    featureText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      flex: 1,
    },
    keyRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 6,
    },
    keyInput: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    saveBtnText: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    keyHint: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 20,
      lineHeight: 16,
    },
    guestBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    guestBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    note: {
      textAlign: "center",
      color: colors.mutedForeground,
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginTop: 16,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Papaleta</Text>
          <Text style={styles.subtitle}>Tu laboratorio de ideas con IA</Text>

          <View style={styles.featuresContainer}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.keyRow}>
            <TextInput
              style={styles.keyInput}
              placeholder="Groq API key (gsk_...)"
              placeholderTextColor={colors.mutedForeground}
              value={groqKey}
              onChangeText={setGroqKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveKey}>
              <Text style={styles.saveBtnText}>
                {keySaved ? "✓" : "Guardar"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.keyHint}>
            Obtén tu key gratis en console.groq.com/keys
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.guestBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleGuest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.guestBtnText}>Entrar y crear ideas</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.note}>Gratis · Sin tarjeta · Datos privados</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
