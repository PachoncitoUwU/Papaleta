import SwiftUI
import SwiftData

struct NotesView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \QuickNote.createdAt, order: .reverse) private var notes: [QuickNote]
    @State private var newNoteText = ""
    @State private var isEditing = false

    var pinnedNotes: [QuickNote] { notes.filter { $0.isPinned } }
    var unpinnedNotes: [QuickNote] { notes.filter { !$0.isPinned } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    newNoteSection

                    if !pinnedNotes.isEmpty {
                        noteSection(title: "Fijadas", icon: "pin.fill", notes: pinnedNotes)
                    }

                    if !unpinnedNotes.isEmpty {
                        noteSection(title: "Notas", icon: "note.text", notes: unpinnedNotes)
                    }

                    if notes.isEmpty {
                        EmptyNoteState()
                    }
                }
                .padding()
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Notas Rapidas")
        }
    }

    var newNoteSection: some View {
        VStack(spacing: 12) {
            TextEditor(text: $newNoteText)
                .font(.body)
                .frame(minHeight: 80)
                .padding(8)
                .background(Color(.tertiarySystemFill))
                .clipShape(.rect(cornerRadius: 16))

            HStack {
                Spacer()
                Button {
                    addNote()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("Agregar nota")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        LinearGradient(
                            colors: [AppColor.paletteOrange, AppColor.paletteTerracotta],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(.capsule)
                }
                .disabled(newNoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .opacity(newNoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
            }
        }
    }

    func noteSection(title: String, icon: String, notes: [QuickNote]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(AppColor.paletteOrange)
                Text(title)
                    .font(.headline)
            }

            ForEach(notes) { note in
                NoteCard(note: note)
            }
        }
    }

    func addNote() {
        let content = newNoteText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        let note = QuickNote(content: content)
        modelContext.insert(note)
        newNoteText = ""
    }
}

struct NoteCard: View {
    @Bindable var note: QuickNote
    @Environment(\.modelContext) private var modelContext
    @State private var isEditing = false
    @State private var editText = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if isEditing {
                TextEditor(text: $editText)
                    .font(.body)
                    .frame(minHeight: 60)
                    .padding(6)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.rect(cornerRadius: 8))
            } else {
                Text(note.content)
                    .font(.body)
                    .foregroundStyle(.primary)
            }

            HStack {
                Text(note.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Spacer()

                Button {
                    note.isPinned.toggle()
                } label: {
                    Image(systemName: note.isPinned ? "pin.fill" : "pin")
                        .font(.caption)
                        .foregroundStyle(note.isPinned ? AppColor.paletteOrange : .secondary)
                }

                Button {
                    if isEditing {
                        note.content = editText
                        isEditing = false
                    } else {
                        editText = note.content
                        isEditing = true
                    }
                } label: {
                    Image(systemName: isEditing ? "checkmark" : "pencil")
                        .font(.caption)
                        .foregroundStyle(AppColor.paletteBlue)
                }

                Button(role: .destructive) {
                    modelContext.delete(note)
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

struct EmptyNoteState: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "note.text")
                .font(.system(size: 56))
                .foregroundStyle(AppColor.paletteOrange.opacity(0.4))
            Text("Sin notas aun")
                .font(.title3.weight(.semibold))
            Text("Escribe una nota rapida para recordar algo importante")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(.top, 80)
    }
}
