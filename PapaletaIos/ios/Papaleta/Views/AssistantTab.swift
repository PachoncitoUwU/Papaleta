import SwiftUI
import SwiftData

struct AssistantTab: View {
    @Bindable var idea: Idea
    @Environment(\.modelContext) private var modelContext
    @State private var messageText = ""
    @State private var isLoading = false
    @FocusState private var isInputFocused: Bool

    var messages: [ChatMessage] {
        (idea.chatMessages ?? []).sorted { $0.createdAt < $1.createdAt }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            WelcomeAssistantView(idea: idea)
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
    }

    private func sendMessage() async {
        let userContent = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userContent.isEmpty else { return }

        let userMessage = ChatMessage(role: .user, content: userContent)
        userMessage.idea = idea
        modelContext.insert(userMessage)
        messageText = ""
        isLoading = true

        do {
            let context = "Idea: \(idea.title). Resumen: \(idea.summary). Contenido: \(idea.rawContent.prefix(500))"
            let history = messages.map { [["role": $0.messageRole.rawValue, "content": $0.content]] }.flatMap { $0 }
            let response = try await AIService.shared.assistantChat(messages: history, ideaContext: context)

            await MainActor.run {
                let assistantMessage = ChatMessage(role: .assistant, content: response)
                assistantMessage.idea = idea
                modelContext.insert(assistantMessage)
                isLoading = false
            }
        } catch {
            await MainActor.run {
                let errorMessage = ChatMessage(role: .assistant, content: "Lo siento, hubo un error. Por favor intenta de nuevo.")
                errorMessage.idea = idea
                modelContext.insert(errorMessage)
                isLoading = false
            }
        }
    }
}

struct MessageBubble: View {
    let message: ChatMessage

    var isUser: Bool {
        message.messageRole == .user
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 40) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .foregroundStyle(isUser ? .white : .primary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isUser ? AppColor.paletteOrange : Color(.secondarySystemGroupedBackground))
                    .clipShape(BubbleShape(isUser: isUser))

                Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }

            if !isUser { Spacer(minLength: 40) }
        }
    }
}

struct BubbleShape: Shape {
    let isUser: Bool

    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 16
        var path = Path()

        if isUser {
            path.move(to: CGPoint(x: rect.minX, y: rect.minY + radius))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.minY + radius), radius: radius, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius), radius: radius, startAngle: .degrees(270), endAngle: .degrees(360), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius - 8))
            path.addQuadCurve(to: CGPoint(x: rect.maxX - 8, y: rect.maxY), control: CGPoint(x: rect.maxX + 4, y: rect.maxY - 4))
            path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.maxY - radius), radius: radius, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
            path.closeSubpath()
        } else {
            path.move(to: CGPoint(x: rect.minX + 8, y: rect.maxY))
            path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - radius - 8), control: CGPoint(x: rect.minX - 4, y: rect.maxY - 4))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.minY + radius), radius: radius, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius), radius: radius, startAngle: .degrees(270), endAngle: .degrees(360), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.maxY - radius), radius: radius, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
            path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
            path.closeSubpath()
        }

        return path
    }
}

struct WelcomeAssistantView: View {
    let idea: Idea

    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(AppColor.paletteOrange.opacity(0.12))
                    .frame(width: 80, height: 80)
                Image(systemName: "sparkles.bubble.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(AppColor.paletteOrange)
            }

            Text("Hola, soy Papaleta")
                .font(.title2.weight(.bold))

            Text("Tu asistente creativo para desarrollar \"\(idea.title)\". Puedo ayudarte a:")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 12) {
                AssistTip(icon: "questionmark.circle", text: "Hacerte preguntas sobre tu idea")
                AssistTip(icon: "checklist", text: "Sugerir proximas tareas")
                AssistTip(icon: "arrow.up.forward", text: "Darte retroalimentacion")
                AssistTip(icon: "chart.bar", text: "Ayudarte a priorizar")
            }
            .padding()
            .glassCard()
        }
        .padding(.top, 40)
    }
}

struct AssistTip: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(AppColor.paletteOrange)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
            Spacer()
        }
    }
}
