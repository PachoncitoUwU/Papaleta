import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIdeas } from "@/contexts/IdeasContext";
import { useColors } from "@/hooks/useColors";
import type { Idea } from "@/lib/storage";

const TAG_COLORS: Record<string, string> = {
  App: "#6366f1",
  Negocio: "#10B981",
  Producto: "#F59E0B",
  Proyecto: "#8B5CF6",
};

function getProgressColor(p: number) {
  if (p >= 70) return "#10B981";
  if (p >= 35) return "#F59E0B";
  return "#EF4444";
}

function IdeaCard({ item }: { item: Idea }) {
  const colors = useColors();
  const tagColor = TAG_COLORS[item.tag] || colors.primary;
  const pct = item.progress || 0;
  const pColor = getProgressColor(pct);

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: 18,
          overflow: "hidden",
          marginHorizontal: 16,
          marginBottom: 12,
          opacity: pressed ? 0.9 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        },
      ]}
      onPress={() => router.push(`/idea/${item.id}`)}
      testID={`idea-card-${item.id}`}
    >
      {item.imgUrl ? (
        <Image
          source={{ uri: item.imgUrl }}
          style={{ width: "100%", height: 140, backgroundColor: colors.muted }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: 100,
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="bulb-outline" size={36} color={colors.border} />
        </View>
      )}
      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              backgroundColor: tagColor + "22",
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_600SemiBold",
                color: tagColor,
              }}
            >
              {item.tag}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: colors.mutedForeground,
            }}
          >
            {new Date(item.createdAt).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Inter_700Bold",
            color: colors.foreground,
            marginBottom: 10,
          }}
          numberOfLines={2}
        >
          {item.title || item.rawText?.slice(0, 80) || "Idea sin título"}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              flex: 1,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct}%` as any,
                height: "100%" as any,
                backgroundColor: pColor,
                borderRadius: 2,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_600SemiBold",
              color: colors.mutedForeground,
            }}
          >
            {pct}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function IdeasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ideas, loading, refresh } = useIdeas();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const keyExtractor = useCallback((item: Idea) => item.id, []);
  const renderItem = useCallback(
    ({ item }: { item: Idea }) => <IdeaCard item={item} />,
    []
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: topInset + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontFamily: "Inter_700Bold",
            color: colors.foreground,
          }}
        >
          Mis Ideas
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            color: colors.mutedForeground,
            marginTop: 2,
          }}
        >
          {ideas.length > 0
            ? `${ideas.length} idea${ideas.length !== 1 ? "s" : ""} guardada${ideas.length !== 1 ? "s" : ""}`
            : "Empieza creando tu primera idea"}
        </Text>
      </View>

      <FlatList
        data={ideas}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={
          ideas.length === 0
            ? { flex: 1 }
            : { paddingTop: 8, paddingBottom: insets.bottom + 100 }
        }
        scrollEnabled={!!ideas.length}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              paddingHorizontal: 32,
            }}
          >
            <Ionicons name="bulb-outline" size={56} color={colors.border} />
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
                color: colors.foreground,
                textAlign: "center",
              }}
            >
              Sin ideas todavía
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              Toca "Nueva" para capturar y analizar tu primera idea con IA
            </Text>
            <Pressable
              style={({ pressed }) => ({
                marginTop: 8,
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
                opacity: pressed ? 0.85 : 1,
              })}
              onPress={() => router.push("/(tabs)/new")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_700Bold",
                  color: "#fff",
                }}
              >
                Crear primera idea
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
