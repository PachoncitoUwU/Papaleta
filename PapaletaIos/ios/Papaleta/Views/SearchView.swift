import SwiftUI
import SwiftData

struct SearchView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]
    @Query(sort: \QuickNote.createdAt, order: .reverse) private var notes: [QuickNote]
    @State private var searchText = ""
    @State private var selectedScope = 0

    var filteredIdeas: [Idea] {
        guard !searchText.isEmpty else { return [] }
        return ideas.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.summary.localizedCaseInsensitiveContains(searchText) ||
            $0.rawContent.localizedCaseInsensitiveContains(searchText) ||
            $0.documentation.localizedCaseInsensitiveContains(searchText)
        }
    }

    var filteredNotes: [QuickNote] {
        guard !searchText.isEmpty else { return [] }
        return notes.filter { $0.content.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            List {
                if searchText.isEmpty {
                    Section("Sugerencias") {
                        Text("Escribe para buscar en ideas, notas y documentacion")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    if selectedScope == 0 || selectedScope == 1 {
                        Section("Ideas (\(filteredIdeas.count))") {
                            ForEach(filteredIdeas) { idea in
                                NavigationLink(value: idea) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(idea.title.isEmpty ? "Sin titulo" : idea.title)
                                            .font(.subheadline.weight(.semibold))
                                        Text(idea.summary.isEmpty ? idea.rawContent.prefix(60) + "..." : idea.summary)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(2)
                                    }
                                }
                            }
                        }
                    }

                    if selectedScope == 0 || selectedScope == 2 {
                        Section("Notas (\(filteredNotes.count))") {
                            ForEach(filteredNotes) { note in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(note.content)
                                        .font(.subheadline)
                                        .lineLimit(3)
                                    Text(note.createdAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .navigationTitle("Buscar")
            .searchable(text: $searchText, prompt: "Buscar en todo...")
            .navigationDestination(for: Idea.self) { idea in
                IdeaDetailView(idea: idea)
            }
        }
    }
}
