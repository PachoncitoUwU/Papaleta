import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIdeas } from "@/contexts/IdeasContext";
import { useColors } from "@/hooks/useColors";
import { aiCall, buildVisualPrompt, pollinationsUrl } from "@/lib/groq";
import type { Idea } from "@/lib/storage";

type Tab = "doc" | "kanban" | "chat";

const KANBAN_COLS: { key: keyof Idea["kanban"]; label: string; color: string }[] = [
  { key: "todo", label: "Por hacer", color: "#6366f1" },
  { key: "doing", label: "En progreso", color: "#F59E0B" },
  { key: "done", label: "Hecho", color: "#10B981" },
];

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: color + "30",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size - stroke * 2 + 4,
          height: size - stroke * 2 + 4,
          borderRadius: (size - stroke * 2 + 4) / 2,
          overflow: "hidden",
        }}
      />
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color }}>
        {pct}%
      </Text>
    </View>
  );
}

function DocView({ doc }: { doc: string }) {
  const colors = useColors();
  const lines = (doc || "").split("\n");

  return (
    <View style={{ gap: 8, padding: 16 }}>
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <Text
              key={i}
              style={{
                fontSize: 22,
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {line.slice(2)}
            </Text>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <Text
              key={i}
              style={{
                fontSize: 16,
                fontFamily: "Inter_700Bold",
                color: colors.primary,
                marginTop: 16,
                marginBottom: 2,
              }}
            >
              {line.slice(3)}
            </Text>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 14, lineHeight: 22 }}>•</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.foreground,
                  lineHeight: 22,
                }}
              >
                {line.slice(2)}
              </Text>
            </View>
          );
        }
        if (line.match(/^\d+\./)) {
          const num = line.match(/^(\d+)\./)?.[1] || "";
          const rest = line.slice(num.length + 1).trim();
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 4 }}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: "Inter_600SemiBold",
                  minWidth: 20,
                }}
              >
                {num}.
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.foreground,
                  lineHeight: 22,
                }}
              >
                {rest}
              </Text>
            </View>
          );
        }
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        return (
          <Text
            key={i}
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: colors.foreground,
              lineHeight: 22,
            }}
          >
            {line}
          </Text>
        );
      })}
    </View>
  );
}

function KanbanView({
  kanban,
  onUpdate,
}: {
  kanban: Idea["kanban"];
  onUpdate: (k: Idea["kanban"]) => void;
}) {
  const colors = useColors();
  const [addingCol, setAddingCol] = useState<keyof Idea["kanban"] | null>(null);
  const [newTask, setNewTask] = useState("");

  function addTask(col: keyof Idea["kanban"]) {
    if (!newTask.trim()) return;
    const updated = { ...kanban, [col]: [...(kanban[col] || []), newTask.trim()] };
    onUpdate(updated);
    setNewTask("");
    setAddingCol(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function moveTask(fromCol: keyof Idea["kanban"], idx: number, toCol: keyof Idea["kanban"]) {
    const task = kanban[fromCol][idx];
    const updated = {
      ...kanban,
      [fromCol]: kanban[fromCol].filter((_, i) => i !== idx),
      [toCol]: [...(kanban[toCol] || []), task],
    };
    onUpdate(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function deleteTask(col: keyof Idea["kanban"], idx: number) {
    const updated = { ...kanban, [col]: kanban[col].filter((_, i) => i !== idx) };
    onUpdate(updated);
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {KANBAN_COLS.map(({ key, label, color }) => (
        <View
          key={key}
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 14,
            borderLeftWidth: 3,
            borderLeftColor: color,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_700Bold",
                color,
              }}
            >
              {label.toUpperCase()} ({(kanban[key] || []).length})
            </Text>
            <Pressable onPress={() => setAddingCol(addingCol === key ? null : key)}>
              <Ionicons name="add-circle-outline" size={22} color={color} />
            </Pressable>
          </View>

          {addingCol === key && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.muted,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                placeholder="Nueva tarea..."
                placeholderTextColor={colors.mutedForeground}
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={() => addTask(key)}
                autoFocus
              />
              <Pressable
                style={{
                  backgroundColor: color,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  justifyContent: "center",
                }}
                onPress={() => addTask(key)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </Pressable>
            </View>
          )}

          {(kanban[key] || []).length === 0 && (
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: colors.mutedForeground,
                textAlign: "center",
                paddingVertical: 8,
              }}
            >
              Sin tareas
            </Text>
          )}

          {(kanban[key] || []).map((task, idx) => {
            const nextCols = KANBAN_COLS.filter((c) => c.key !== key);
            return (
              <View
                key={idx}
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: colors.foreground,
                  }}
                >
                  {task}
                </Text>
                {nextCols.map((nc) => (
                  <Pressable
                    key={nc.key}
                    onPress={() => moveTask(key, idx, nc.key)}
                  >
                    <Ionicons
                      name={nc.key === "done" ? "checkmark-circle-outline" : "arrow-forward-outline"}
                      size={18}
                      color={nc.color}
                    />
                  </Pressable>
                ))}
                <Pressable onPress={() => deleteTask(key, idx)}>
                  <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

function ChatView({ idea }: { idea: Idea }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: `Hola! Soy tu asistente para la idea "${idea.title}". ¿En qué te puedo ayudar?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function sendMsg() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const context = `IDEA: ${idea.title}\n\nDOCUMENTO:\n${idea.doc?.slice(0, 1000)}\n\nPREGUNTA: ${userMsg}`;
      const reply = await aiCall(context);
      setMsgs((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (e: any) {
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", text: "Error: " + e.message },
      ]);
    } finally {
      setLoading(false);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {msgs.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              backgroundColor:
                m.role === "user" ? colors.primary : colors.card,
              borderRadius: 16,
              borderBottomRightRadius: m.role === "user" ? 4 : 16,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: m.role === "user" ? "#fff" : colors.foreground,
                lineHeight: 20,
              }}
            >
              {m.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.card,
              borderRadius: 16,
              borderBottomLeftRadius: 4,
              padding: 14,
            }}
          >
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 12,
          paddingBottom: 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            color: colors.foreground,
            borderWidth: 1,
            borderColor: colors.border,
            maxHeight: 80,
          }}
          placeholder="Pregunta sobre tu idea..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={sendMsg}
        />
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: input.trim() ? colors.primary : colors.border,
            borderRadius: 24,
            width: 44,
            height: 44,
            alignSelf: "flex-end",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
          onPress={sendMsg}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function IdeaDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ideas, updateField, removeIdea } = useIdeas();

  const idea = ideas.find((i) => i.id === id);
  const [tab, setTab] = useState<Tab>("doc");
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressInput, setProgressInput] = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);

  useEffect(() => {
    if (idea) setProgressInput(String(idea.progress || 0));
  }, [idea?.id]);

  async function handleGenerateImage() {
    if (!idea) return;
    setGeneratingImg(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const prompt = idea.imgPrompt || buildVisualPrompt(idea.rawText || idea.title || "");
      const url = pollinationsUrl(prompt);
      await updateField(idea.id, "imgUrl", url);
      await updateField(idea.id, "imgPrompt", prompt);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo generar la imagen.");
    } finally {
      setGeneratingImg(false);
    }
  }

  if (!idea) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const pct = idea.progress || 0;
  const pColor = pct >= 70 ? "#10B981" : pct >= 35 ? "#F59E0B" : "#EF4444";

  function handleUpdateProgress() {
    const val = Math.max(0, Math.min(100, parseInt(progressInput) || 0));
    updateField(idea!.id, "progress", val);
    setEditingProgress(false);
  }

  function handleDelete() {
    Alert.alert("Eliminar idea", "¿Seguro que quieres eliminar esta idea?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await removeIdea(idea!.id);
          router.back();
        },
      },
    ]);
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "doc", label: "Documento", icon: "document-text-outline" },
    { key: "kanban", label: "Kanban", icon: "grid-outline" },
    { key: "chat", label: "IA Chat", icon: "chatbubble-outline" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {idea.imgUrl ? (
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: idea.imgUrl }}
            style={{ width: "100%", height: 220, backgroundColor: colors.muted }}
            resizeMode="cover"
          />
          {/* Botón regenerar imagen */}
          <Pressable
            style={({ pressed }) => ({
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.7 : 1,
            })}
            onPress={handleGenerateImage}
            disabled={generatingImg}
          >
            {generatingImg ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh-outline" size={14} color="#fff" />
            )}
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
              {generatingImg ? "Generando..." : "Regenerar"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            width: "100%",
            height: 140,
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
            marginTop: insets.top + 48,
            gap: 12,
          }}
        >
          {generatingImg ? (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                Generando imagen...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color={colors.border} />
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={handleGenerateImage}
              >
                <Ionicons name="sparkles-outline" size={14} color="#fff" />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
                  Generar imagen con IA
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
                lineHeight: 26,
              }}
              numberOfLines={2}
            >
              {idea.title || "Idea sin título"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_600SemiBold",
                    color: colors.primary,
                  }}
                >
                  {idea.tag}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_400Regular",
                  color: colors.mutedForeground,
                }}
              >
                {new Date(idea.createdAt).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Pressable onPress={() => setEditingProgress(true)}>
              <ProgressRing pct={pct} color={pColor} />
            </Pressable>
          </View>
        </View>

        {editingProgress && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.muted,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="0-100"
              value={progressInput}
              onChangeText={setProgressInput}
              keyboardType="number-pad"
              autoFocus
              maxLength={3}
            />
            <Pressable
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
              onPress={handleUpdateProgress}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
            </Pressable>
            <Pressable
              style={{
                backgroundColor: colors.muted,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
              onPress={() => setEditingProgress(false)}
            >
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          backgroundColor: colors.muted,
          borderRadius: 12,
          padding: 3,
          marginBottom: 4,
        }}
      >
        {TABS.map(({ key, label, icon }) => (
          <Pressable
            key={key}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor:
                tab === key ? colors.card : "transparent",
            }}
            onPress={() => setTab(key)}
          >
            <Ionicons
              name={icon as any}
              size={14}
              color={tab === key ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color:
                  tab === key ? colors.foreground : colors.mutedForeground,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === "doc" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          >
            <DocView doc={idea.doc} />

            <Pressable
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 8,
                padding: 14,
                backgroundColor: colors.destructive + "15",
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: colors.destructive,
                }}
              >
                Eliminar idea
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {tab === "kanban" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          >
            <KanbanView
              kanban={idea.kanban}
              onUpdate={(k) => updateField(idea.id, "kanban", k)}
            />
          </ScrollView>
        )}

        {tab === "chat" && <ChatView idea={idea} />}
      </View>
    </View>
  );
}
