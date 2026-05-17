import SwiftUI
import SwiftData
import PhotosUI

struct TimelineTab: View {
    @Bindable var idea: Idea
    @Environment(\.modelContext) private var modelContext
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var userNote = ""
    @State private var isAnalyzing = false

    var sortedEntries: [TimelineEntry] {
        (idea.timelineEntries ?? []).sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        VStack(spacing: 16) {
            uploadSection

            if !sortedEntries.isEmpty {
                Text("\(sortedEntries.count) entradas")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            ForEach(sortedEntries) { entry in
                TimelineCard(entry: entry)
            }

            if sortedEntries.isEmpty {
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(AppColor.paletteOrange.opacity(0.12))
                            .frame(width: 72, height: 72)
                        Image(systemName: "photo.stack")
                            .font(.system(size: 32))
                            .foregroundStyle(AppColor.paletteOrange.opacity(0.6))
                    }
                    Text("Sin entradas aun")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Sube fotos del progreso de tu idea y la IA las analizara automaticamente")
                        .font(.caption)
                        .foregroundStyle(.secondary.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)
            }
        }
        .overlay {
            if isAnalyzing {
                ZStack {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("La IA esta analizando la foto...")
                            .font(.subheadline)
                            .foregroundStyle(.white)
                    }
                    .padding(20)
                    .background(.ultraThinMaterial)
                    .clipShape(.rect(cornerRadius: 16))
                }
            }
        }
    }

    var uploadSection: some View {
        VStack(spacing: 12) {
            PhotosPicker(selection: $selectedItems, maxSelectionCount: 1, matching: .images) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Subir foto a la linea de tiempo")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(AppColor.paletteOrange)
                .frame(maxWidth: .infinity)
                .padding()
                .glassCard()
            }
            .onChange(of: selectedItems) { _, newItems in
                Task {
                    guard let item = newItems.first else { return }
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        await analyzeAndSave(imageData: data)
                    }
                }
            }

            TextField("Nota opcional sobre la foto...", text: $userNote)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func analyzeAndSave(imageData: Data) async {
        isAnalyzing = true
        do {
            let description = try await AIService.shared.analyzePhoto(imageData: imageData, userNote: userNote)
            await MainActor.run {
                let entry = TimelineEntry(
                    imageData: imageData,
                    aiDescription: description,
                    userNote: userNote,
                    createdAt: Date()
                )
                entry.idea = idea
                modelContext.insert(entry)
                userNote = ""
                selectedItems = []
                isAnalyzing = false
            }
        } catch {
            await MainActor.run {
                isAnalyzing = false
            }
        }
    }
}

struct TimelineCard: View {
    let entry: TimelineEntry
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let imageData = entry.imageData, let uiImage = UIImage(data: imageData) {
                Color.clear
                    .frame(height: 180)
                    .overlay {
                        Image(uiImage: uiImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 16))
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(AppColor.paletteOrange)
                            .font(.caption)
                        Text("Analisis de IA")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(AppColor.paletteOrange)
                    }
                    Spacer()
                    Text(entry.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text(entry.aiDescription)
                    .font(.body)
                    .foregroundStyle(.primary)

                if !entry.userNote.isEmpty {
                    Text(entry.userNote)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }

            HStack {
                Spacer()
                Button(role: .destructive) {
                    modelContext.delete(entry)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                }
            }
        }
        .padding()
        .glassCard()
    }
}

struct AllTimelineView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \TimelineEntry.createdAt, order: .reverse) private var allEntries: [TimelineEntry]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if allEntries.isEmpty {
                        VStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(AppColor.paletteOrange.opacity(0.12))
                                    .frame(width: 100, height: 100)
                                Image(systemName: "clock.arrow.circlepath")
                                    .font(.system(size: 48))
                                    .foregroundStyle(AppColor.paletteOrange.opacity(0.5))
                            }
                            Text("Linea de tiempo vacia")
                                .font(.title3.weight(.semibold))
                            Text("Las fotos que subas en tus ideas apareceran aqui")
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 32)
                        }
                        .padding(.top, 120)
                    } else {
                        ForEach(allEntries) { entry in
                            if let idea = entry.idea {
                                VStack(alignment: .leading, spacing: 4) {
                                    NavigationLink(value: idea) {
                                        Text(idea.title)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(AppColor.paletteOrange)
                                    }
                                    TimelineCard(entry: entry)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Linea de Tiempo")
            .navigationDestination(for: Idea.self) { idea in
                IdeaDetailView(idea: idea)
            }
        }
    }
}
