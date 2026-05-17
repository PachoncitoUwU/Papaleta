import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useIdeas } from "@/contexts/IdeasContext";
import { useColors } from "@/hooks/useColors";
import { aiCall, buildFreeQuestions, buildVisualPrompt, detectTag, pollinationsUrl } from "@/lib/groq";

type Phase = "input" | "questions" | "analyzing" | "done";

interface QAnswer {
  q: string;
  a: string;
}

function buildFullPrompt(raw: string, qa: QAnswer[]): string {
  const answers = qa.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n");
  return `Eres un estratega de ideas. Analiza esta idea y genera un documento completo en español.

IDEA: ${raw}

RESPUESTAS DE CONTEXTO:
${answers}

Genera en MARKDOWN:
1. # Título impactante (una línea)
2. ## Resumen ejecutivo (2-3 oraciones)
3. ## Problema que resuelve
4. ## Propuesta de valor única
5. ## Público objetivo
6. ## Primeros 3 pasos concretos
7. ## Riesgos y cómo mitigarlos
8. ## Métricas de éxito

Sé específico, práctico y motivador.`;
}

export default function NewIdeaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addIdea, log } = useIdeas();

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [currentA, setCurrentA] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  function handleAnalyze() {
    if (!text.trim() || text.trim().length < 15) {
      Alert.alert("Idea muy corta", "Describe tu idea con un poco más de detalle.");
      return;
    }
    const qs = buildFreeQuestions(text);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(""));
    setCurrentQ(0);
    setCurrentA("");
    setPhase("questions");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleNextQ() {
    const newAnswers = [...answers];
    newAnswers[currentQ] = currentA;
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setCurrentA(newAnswers[currentQ + 1] || "");
    } else {
      generateDoc(newAnswers);
    }
  }

  function handleSkipQ() {
    const newAnswers = [...answers];
    newAnswers[currentQ] = "";
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setCurrentA(newAnswers[currentQ + 1] || "");
    } else {
      generateDoc(newAnswers);
    }
  }

  async function generateDoc(finalAnswers: string[]) {
    setPhase("analyzing");
    setAnalyzing(true);
    try {
      const qa: { q: string; a: string }[] = questions.map((q, i) => ({
        q,
        a: finalAnswers[i] || "",
      }));
      const doc = await aiCall(buildFullPrompt(text, qa));

      const firstLine = doc.split("\n").find((l) => l.startsWith("# ")) || "";
      const title = firstLine.replace(/^#\s*/, "").trim() || text.slice(0, 60);
      const tag = detectTag(text);
      const imgPrompt = buildVisualPrompt(text);
      const imgUrl = pollinationsUrl(imgPrompt);

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const idea = {
        id,
        uid: user?.uid || "",
        title,
        tag,
        rawText: text,
        doc,
        imgPrompt,
        imgUrl,
        kanban: {
          todo: ["Validar concepto", "Definir usuarios"],
          doing: [],
          done: [],
        },
        timeline: [],
        progress: 10,
        createdAt: new Date().toISOString(),
      };

      await addIdea(idea);
      await log();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setPhase("done");
      setTimeout(() => {
        router.push(`/idea/${id}`);
        resetForm();
      }, 800);
    } catch (e: any) {
      Alert.alert("Error de IA", e.message || "No se pudo generar el análisis.");
      setPhase("questions");
    } finally {
      setAnalyzing(false);
    }
  }

  function resetForm() {
    setText("");
    setPhase("input");
    setQuestions([]);
    setAnswers([]);
    setCurrentQ(0);
    setCurrentA("");
  }

  const progressPct = Math.round(((currentQ + 1) / (questions.length || 1)) * 100);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: topInset + 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
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
          Nueva Idea
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            color: colors.mutedForeground,
            marginBottom: 24,
          }}
        >
          Describe cualquier idea — la IA la estructurará
        </Text>

        {(phase === "input" || phase === "done") && (
          <>
            <TextInput
              ref={inputRef}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 18,
                fontSize: 15,
                fontFamily: "Inter_400Regular",
                color: colors.foreground,
                minHeight: 160,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
              placeholder="Ej: Una app para que vecinos compartan herramientas prestadas..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1200}
              testID="idea-text-input"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_400Regular",
                  color: colors.mutedForeground,
                }}
              >
                {text.length}/1200
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor:
                  text.trim().length < 15
                    ? colors.border
                    : colors.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: text.trim().length < 15 ? 0 : 0.25,
                shadowRadius: 12,
                elevation: 4,
              })}
              onPress={handleAnalyze}
              disabled={text.trim().length < 15}
              testID="analyze-btn"
            >
              <Ionicons name="flash" size={20} color="#fff" />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                  color: "#fff",
                }}
              >
                Analizar con IA
              </Text>
            </Pressable>
          </>
        )}

        {phase === "questions" && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              gap: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.mutedForeground,
                }}
              >
                Pregunta {currentQ + 1} de {questions.length}
              </Text>
              <View
                style={{
                  width: 80,
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${progressPct}%` as any,
                    height: "100%" as any,
                    backgroundColor: colors.primary,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>

            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
                color: colors.foreground,
                lineHeight: 26,
              }}
            >
              {questions[currentQ]}
            </Text>

            <TextInput
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.foreground,
                minHeight: 100,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="Tu respuesta..."
              placeholderTextColor={colors.mutedForeground}
              value={currentA}
              onChangeText={setCurrentA}
              multiline
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={handleSkipQ}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: colors.mutedForeground,
                  }}
                >
                  Saltar
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  flex: 2,
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
                onPress={handleNextQ}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_700Bold",
                    color: "#fff",
                  }}
                >
                  {currentQ < questions.length - 1 ? "Siguiente" : "Generar"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === "analyzing" && (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              paddingVertical: 60,
            }}
          >
            <ActivityIndicator color={colors.primary} size="large" />
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_600SemiBold",
                color: colors.foreground,
                textAlign: "center",
              }}
            >
              Analizando tu idea...
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: colors.mutedForeground,
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              La IA está estructurando tu idea en un documento completo
            </Text>
          </View>
        )}

        {phase === "done" && (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              paddingVertical: 60,
            }}
          >
            <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
              }}
            >
              Idea guardada
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.mutedForeground,
              }}
            >
              Abriendo tu workspace...
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
