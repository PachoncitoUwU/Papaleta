import SwiftUI
import SwiftData

struct GlobalAssistantView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ChatMessage.createdAt, order: .reverse) private var allMessages: [ChatMessage]
    @State private var messageText = ""
    @State private var isLoading = false
    @FocusState private var isInputFocused: Bool

    var messages: [ChatMessage] {
        allMessages.filter { $0.idea == nil }.sorted { $0.createdAt < $1.createdAt }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            WelcomeGlobalAssistantView()
                        } else {
                            ForEach(messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            HStack(spacing: 12) {
                TextField("Escribe a Papaleta...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                    .focused($isInputFocused)

                Button {
                    Task { await sendMessage() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(messageText.isEmpty || isLoading ? .secondary : AppColor.paletteOrange)
                }
                .disabled(messageText.isEmpty || isLoading)
            }
            .padding()
            .background(.ultraThinMaterial)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Asistente IA")
    }

    private func sendMessage() async {
        let userContent = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userContent.isEmpty else { return }

        let userMessage = ChatMessage(role: .user, content: userContent)
        modelContext.insert(userMessage)
        messageText = ""
        isLoading = true

        do {
            let context = "Eres Papaleta, un asistente creativo general. El usuario te esta hablando sin una idea especifica. Ayudale a organizar sus pensamientos, sugerirle ideas, o responder sus preguntas."
            let history = messages.map { [["role": $0.messageRole.rawValue, "content": $0.content]] }.flatMap { $0 }
            let response = try await AIService.shared.assistantChat(messages: history, ideaContext: context)

            await MainActor.run {
                let assistantMessage = ChatMessage(role: .assistant, content: response)
                modelContext.insert(assistantMessage)
                isLoading = false
            }
        } catch {
            await MainActor.run {
                let assistantMessage = ChatMessage(role: .assistant, content: "Lo siento, hubo un error. Por favor intenta de nuevo.")
                modelContext.insert(assistantMessage)
                isLoading = false
            }
        }
    }
}

struct WelcomeGlobalAssistantView: View {
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(AppColor.paletteOrange.opacity(0.12))
                    .frame(width: 100, height: 100)
                Image(systemName: "sparkles.bubble.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(AppColor.paletteOrange)
            }

            Text("Hola, soy Papaleta")
                .font(.title2.weight(.bold))

            Text("Tu asistente creativo. Puedo ayudarte a:")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 12) {
                AssistTip(icon: "lightbulb", text: "Generar nuevas ideas")
                AssistTip(icon: "brain.head.profile", text: "Organizar tus pensamientos")
                AssistTip(icon: "arrow.up.forward", text: "Darte retroalimentacion")
                AssistTip(icon: "doc.text", text: "Ayudarte a documentar")
            }
            .padding()
            .glassCard()
        }
        .padding(.top, 40)
    }
}
