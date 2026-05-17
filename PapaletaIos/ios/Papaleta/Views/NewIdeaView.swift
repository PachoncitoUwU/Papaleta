import SwiftUI
import SwiftData
import PhotosUI

struct NewIdeaView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var content = ""
    @State private var selectedImages: [PhotosPickerItem] = []
    @State private var selectedImageData: Data?
    @State private var extractedText = ""
    @State private var showQuestions = false
    @State private var questions: [String] = []
    @State private var answers: [String] = []
    @State private var generatedTitle = ""
    @State private var generatedSummary = ""
    @State private var generatedDocumentation = ""
    @State private var generatedImageData: Data?
    @State private var selectedCategory = "General"
    @State private var isLoading = false
    @State private var loadingMessage = ""
    @State private var currentStep = 0
    @State private var showError = false
    @State private var errorMessage = ""

    let categories = ["General", "Tecnologia", "Arte", "Negocios", "Salud", "Educacion", "Hogar", "Viajes"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    stepIndicator

                    if currentStep == 0 {
                        inputSection
                    } else if currentStep == 1 {
                        questionsSection
                    } else if currentStep == 2 {
                        reviewSection
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Nueva Idea")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") { dismiss() }
                }
            }
            .overlay {
                if isLoading {
                    LoadingOverlay(message: loadingMessage)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    var stepIndicator: some View {
        HStack(spacing: 0) {
            ForEach(0..<3) { step in
                HStack(spacing: 0) {
                    Circle()
                        .fill(step <= currentStep ? AppColor.paletteOrange : Color(.tertiarySystemFill))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Text("\(step + 1)")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(step <= currentStep ? .white : .secondary)
                        )

                    if step < 2 {
                        Rectangle()
                            .fill(step < currentStep ? AppColor.paletteOrange : Color(.tertiarySystemFill))
                            .frame(height: 3)
                    }
                }
            }
        }
        .padding(.horizontal, 40)
    }

    var inputSection: some View {
        VStack(spacing: 16) {
            Text("Describe tu idea")
                .font(.title2.weight(.bold))
                .frame(maxWidth: .infinity, alignment: .leading)

            TextEditor(text: $content)
                .font(.body)
                .frame(minHeight: 120)
                .padding(8)
                .background(Color(.tertiarySystemFill))
                .clipShape(.rect(cornerRadius: 16))

            if !extractedText.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "doc.text")
                            .foregroundStyle(AppColor.paletteOrange)
                        Text("Texto extraido de la imagen")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Button {
                            extractedText = ""
                            selectedImageData = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                    Text(extractedText)
                        .font(.body)
                        .foregroundStyle(.primary)
                        .padding()
                        .background(Color(.tertiarySystemFill))
                        .clipShape(.rect(cornerRadius: 12))
                }
            }

            HStack(spacing: 12) {
                PhotosPicker(selection: $selectedImages, maxSelectionCount: 1, matching: .images) {
                    VStack(spacing: 8) {
                        Image(systemName: "camera.fill")
                            .font(.title2)
                        Text("Foto")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .glassCard()
                }
                .onChange(of: selectedImages) { _, newItems in
                    Task {
                        guard let item = newItems.first else { return }
                        if let data = try? await item.loadTransferable(type: Data.self) {
                            selectedImageData = data
                            await extractText(from: data)
                        }
                    }
                }

                Button {
                    // Audio recording placeholder
                } label: {
                    VStack(spacing: 8) {
                        Image(systemName: "mic.fill")
                            .font(.title2)
                        Text("Audio")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .glassCard()
                }
                .disabled(true)
                .opacity(0.5)
            }
            .foregroundStyle(.primary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Categoria")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(categories, id: \.self) { cat in
                            CategoryChip(
                                title: cat,
                                color: AppColor.colorForCategory(cat),
                                isSelected: selectedCategory == cat
                            ) {
                                withAnimation { selectedCategory = cat }
                            }
                        }
                    }
                }
                .contentMargins(.horizontal, 0, for: .scrollContent)
            }

            Button {
                Task { await generateQuestions() }
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                    Text("Continuar con IA")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [AppColor.paletteOrange, AppColor.paletteTerracotta],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(.rect(cornerRadius: 16))
            }
            .disabled(content.isEmpty && extractedText.isEmpty)
            .opacity(content.isEmpty && extractedText.isEmpty ? 0.5 : 1)
        }
    }

    var questionsSection: some View {
        VStack(spacing: 20) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(AppColor.paletteOrange)
                Text("Preguntas para refinar tu idea")
                    .font(.title3.weight(.bold))
                Spacer()
            }

            Text("Responde estas preguntas para que la IA genere un mejor titulo y resumen.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            ForEach(Array(questions.enumerated()), id: \.offset) { index, question in
                VStack(alignment: .leading, spacing: 8) {
                    Text(question)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)

                    TextField("Tu respuesta...", text: Binding(
                        get: { index < answers.count ? answers[index] : "" },
                        set: { val in
                            if index < answers.count {
                                answers[index] = val
                            } else {
                                while answers.count <= index { answers.append("") }
                                answers[index] = val
                            }
                        }
                    ))
                    .textFieldStyle(.roundedBorder)
                }
                .padding()
                .glassCard()
            }

            Button {
                Task { await generateContent() }
            } label: {
                HStack {
                    Image(systemName: "wand.and.stars")
                    Text("Generar idea")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [AppColor.paletteOrange, AppColor.paletteTerracotta],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(.rect(cornerRadius: 16))
            }
        }
    }

    var reviewSection: some View {
        VStack(spacing: 20) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(AppColor.paletteGreen)
                Text("Tu idea esta lista")
                    .font(.title3.weight(.bold))
                Spacer()
            }

            VStack(alignment: .leading, spacing: 12) {
                Label("Titulo", systemImage: "textformat")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                TextField("Titulo de tu idea", text: $generatedTitle)
                    .font(.title3.weight(.semibold))
                    .padding()
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.rect(cornerRadius: 12))

                Label("Resumen", systemImage: "doc.text")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                TextEditor(text: $generatedSummary)
                    .font(.body)
                    .frame(minHeight: 80)
                    .padding(8)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.rect(cornerRadius: 12))

                if let imageData = generatedImageData, let uiImage = UIImage(data: imageData) {
                    Label("Imagen generada", systemImage: "photo")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .clipShape(.rect(cornerRadius: 12))
                }
            }

            Button {
                saveIdea()
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.down.fill")
                    Text("Guardar idea")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [AppColor.paletteOrange, AppColor.paletteTerracotta],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(.rect(cornerRadius: 16))
            }
        }
    }

    private func extractText(from data: Data) async {
        isLoading = true
        loadingMessage = "Extrayendo texto de la imagen..."
        do {
            let text = try await AIService.shared.extractTextFromImage(imageData: data)
            await MainActor.run {
                extractedText = text
                if content.isEmpty {
                    content = text
                } else {
                    content += "\n\nTexto de imagen:\n" + text
                }
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showError = true
                isLoading = false
            }
        }
    }

    private func generateQuestions() async {
        let fullContent = content + (extractedText.isEmpty ? "" : "\n\n" + extractedText)
        guard !fullContent.isEmpty else { return }

        isLoading = true
        loadingMessage = "La IA esta pensando en preguntas..."
        do {
            let qs = try await AIService.shared.askQuestions(about: fullContent)
            await MainActor.run {
                questions = qs
                answers = Array(repeating: "", count: qs.count)
                currentStep = 1
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showError = true
                isLoading = false
            }
        }
    }

    private func generateContent() async {
        let fullContent = content + (extractedText.isEmpty ? "" : "\n\n" + extractedText)
        let answersText = answers.enumerated().map { "\($0 + 1). \(questions[safe: $0] ?? ""): \($1)" }.joined(separator: "\n")

        isLoading = true
        loadingMessage = "Generando titulo y resumen..."
        do {
            let title = try await AIService.shared.generateTitle(from: fullContent, answers: answersText)
            async let summaryTask = AIService.shared.generateSummary(from: fullContent)
            async let docsTask = AIService.shared.generateDocumentation(from: fullContent, title: title)
            async let imageTask = AIService.shared.generateIdeaImage(from: fullContent, title: title)

            let (summary, docs, imageData) = try await (summaryTask, docsTask, imageTask)

            await MainActor.run {
                generatedTitle = title
                generatedSummary = summary
                generatedDocumentation = docs
                generatedImageData = imageData
                currentStep = 2
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showError = true
                isLoading = false
            }
        }
    }

    private func saveIdea() {
        let idea = Idea(
            title: generatedTitle,
            rawContent: content,
            summary: generatedSummary,
            documentation: generatedDocumentation,
            generatedImageData: generatedImageData,
            status: .draft,
            category: selectedCategory
        )
        modelContext.insert(idea)
        dismiss()
    }
}

struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.2)
                    .tint(.white)
                Text(message)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
            }
            .padding(24)
            .background(.ultraThinMaterial)
            .clipShape(.rect(cornerRadius: 16))
        }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
