import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useIdeas } from "@/contexts/IdeasContext";
import { useColors } from "@/hooks/useColors";
import { GROQ_KEY_STORAGE } from "@/lib/groq";
import {
  calcStreak,
  getActivityMap,
} from "@/lib/storage";

function StatCard({
  value,
  label,
  icon,
  color,
}: {
  value: string | number;
  label: string;
  icon: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 16,
        alignItems: "center",
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        style={{
          backgroundColor: color + "22",
          borderRadius: 10,
          padding: 8,
        }}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ActivityHeatmap({ hm }: { hm: Record<string, number> }) {
  const colors = useColors();
  const WEEKS = 12;
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: hm[key] || 0 });
  }
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function cellColor(count: number) {
    if (count === 0) return colors.border;
    if (count === 1) return colors.primary + "55";
    if (count <= 3) return colors.primary + "aa";
    return colors.primary;
  }

  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ gap: 3 }}>
          {week.map((cell) => (
            <View
              key={cell.date}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: cellColor(cell.count),
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { ideas } = useIdeas();

  const [groqKey, setGroqKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [hm, setHm] = useState<Record<string, number>>({});

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    AsyncStorage.getItem(GROQ_KEY_STORAGE).then((k) => {
      if (k) setGroqKey(k);
    });
    getActivityMap().then(setHm);
  }, []);

  const total = ideas.length;
  const inProgress = ideas.filter((i) => i.progress > 0 && i.progress < 100).length;
  const completed = ideas.filter((i) => i.progress >= 100).length;
  const streak = calcStreak(hm);

  async function handleSaveKey() {
    if (groqKey.trim()) {
      await AsyncStorage.setItem(GROQ_KEY_STORAGE, groqKey.trim());
    } else {
      await AsyncStorage.removeItem(GROQ_KEY_STORAGE);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function handleSignOut() {
    Alert.alert("Cerrar sesión", "¿Salir de la cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topInset + 12,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 30,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          marginBottom: 4,
        }}
      >
        Perfil
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginBottom: 24,
        }}
      >
        {user?.displayName || "Creador Local"}
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <StatCard
          value={total}
          label="Ideas"
          icon="bulb-outline"
          color={colors.primary}
        />
        <StatCard
          value={inProgress}
          label="En progreso"
          icon="flash-outline"
          color="#F59E0B"
        />
        <StatCard
          value={streak}
          label="Racha días"
          icon="flame-outline"
          color="#EF4444"
        />
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Actividad (12 semanas)
        </Text>
        <ActivityHeatmap hm={hm} />
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: colors.foreground,
            marginBottom: 4,
          }}
        >
          Groq API Key
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: colors.mutedForeground,
            marginBottom: 12,
          }}
        >
          Requerida para análisis con IA · console.groq.com/keys
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.muted,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            placeholder="gsk_..."
            placeholderTextColor={colors.mutedForeground}
            value={groqKey}
            onChangeText={setGroqKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: keySaved ? "#10B981" : colors.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
            })}
            onPress={handleSaveKey}
          >
            <Ionicons
              name={keySaved ? "checkmark" : "save-outline"}
              size={18}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.destructive + "15",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          opacity: pressed ? 0.8 : 1,
        })}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: colors.destructive,
          }}
        >
          Cerrar sesión
        </Text>
      </Pressable>
    </ScrollView>
  );
}
