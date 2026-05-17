import SwiftUI
import SwiftData

struct IdeaDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var idea: Idea
    @State private var selectedTab = 0
    @State private var showDeleteConfirmation = false
    @State private var showAddTag = false
    @State private var newTagName = ""

    let tabs = ["Resumen", "Tareas", "Timeline", "Asistente", "Docs"]

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                headerSection
                tabPicker
                tabContent
                    .padding(.horizontal)
                    .padding(.bottom, 32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(idea.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    Button {
                        idea.isFavorite.toggle()
                    } label: {
                        Image(systemName: idea.isFavorite ? "heart.fill" : "heart")
                            .foregroundStyle(idea.isFavorite ? AppColor.paletteRed : .primary)
                    }

                    Menu {
                        Button {
                            showAddTag = true
                        } label: {
                            Label("Agregar etiqueta", systemImage: "tag")
                        }

                        Button {
                            showDeleteConfirmation = true
                        } label: {
                            Label("Eliminar idea", systemImage: "trash")
                        }
                        .tint(.red)
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .alert("Eliminar idea?", isPresented: $showDeleteConfirmation) {
            Button("Cancelar", role: .cancel) {}
            Button("Eliminar", role: .destructive) {
                modelContext.delete(idea)
                dismiss()
            }
        } message: {
            Text("Esta accion no se puede deshacer.")
        }
        .sheet(isPresented: $showAddTag) {
            AddTagSheet(idea: idea)
        }
    }

    var headerSection: some View {
        VStack(spacing: 16) {
            if let imageData = idea.generatedImageData, let uiImage = UIImage(data: imageData) {
                Color.clear
                    .frame(height: 200)
                    .overlay {
                        Image(uiImage: uiImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 20))
            }

            VStack(spacing: 10) {
                TextField("Titulo", text: $idea.title)
                    .font(.title2.weight(.bold))
                    .multilineTextAlignment(.center)

                HStack(spacing: 8) {
                    CategoryBadge(category: idea.category, color: idea.categoryColor)
                    StatusPicker(status: $idea.ideaStatus)
                }

                if let tags = idea.tags, !tags.isEmpty {
                    FlowLayout(spacing: 6) {
                        ForEach(tags) { tag in
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color(hex: tag.colorHex))
                                    .frame(width: 6, height: 6)
                                Text(tag.name)
                                    .font(.caption2.weight(.medium))
                            }
                            .foregroundStyle(Color(hex: tag.colorHex))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color(hex: tag.colorHex).opacity(0.12))
                            .clipShape(.capsule)
                        }
                    }
                }

                if idea.progressPercentage > 0 {
                    VStack(spacing: 6) {
                        HStack {
                            Text("Progreso")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(idea.progressPercentage)%")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(AppColor.paletteOrange)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color(.tertiarySystemFill))
                                    .frame(height: 8)
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(
                                        LinearGradient(
                                            colors: [AppColor.paletteOrange, AppColor.paletteYellow],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: max(0, geo.size.width * CGFloat(idea.progressPercentage) / 100), height: 8)
                            }
                        }
                        .frame(height: 8)
                    }
                }

                Text("Creada el \(idea.createdAt.formatted(date: .long, time: .shortened))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .glassCard()
        .padding()
    }

    var tabPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            selectedTab = index
                        }
                    } label: {
                        VStack(spacing: 6) {
                            Text(tab)
                                .font(.subheadline.weight(selectedTab == index ? .semibold : .regular))
                                .foregroundStyle(selectedTab == index ? AppColor.paletteOrange : .secondary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)

                            if selectedTab == index {
                                Capsule()
                                    .fill(AppColor.paletteOrange)
                                    .frame(height: 3)
                                    .matchedGeometryEffect(id: "tabIndicator", in: animationNamespace)
                            } else {
                                Capsule()
                                    .fill(Color.clear)
                                    .frame(height: 3)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
        .contentMargins(.horizontal, 16, for: .scrollContent)
    }

    @Namespace private var animationNamespace

    var tabContent: some View {
        Group {
            switch selectedTab {
            case 0: SummaryTab(idea: idea)
            case 1: TasksTab(idea: idea)
            case 2: TimelineTab(idea: idea)
            case 3: AssistantTab(idea: idea)
            case 4: DocumentationTab(idea: idea)
            default: EmptyView()
            }
        }
    }
}

struct CategoryBadge: View {
    let category: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(category)
                .font(.caption.weight(.medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(color.opacity(0.12))
        .clipShape(.capsule)
    }
}

struct StatusPicker: View {
    @Binding var status: IdeaStatus

    var color: Color {
        switch status {
        case .draft: return .gray
        case .inProgress: return AppColor.paletteOrange
        case .completed: return AppColor.paletteGreen
        case .archived: return AppColor.palettePurple
        }
    }

    var body: some View {
        Menu {
            ForEach(IdeaStatus.allCases, id: \.self) { s in
                Button {
                    status = s
                } label: {
                    HStack {
                        Text(s.rawValue)
                        if status == s {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                Text(status.rawValue)
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color.opacity(0.12))
            .clipShape(.capsule)
        }
    }
}

struct SummaryTab: View {
    @Bindable var idea: Idea

    var body: some View {
        VStack(spacing: 16) {
            EditableCard(title: "Resumen", icon: "doc.text", content: $idea.summary)
            EditableCard(title: "Contenido original", icon: "text.alignleft", content: $idea.rawContent)
        }
    }
}

struct DocumentationTab: View {
    @Bindable var idea: Idea

    var body: some View {
        EditableCard(title: "Documentacion", icon: "doc.text.fill", content: $idea.documentation, minHeight: 300)
    }
}

struct EditableCard: View {
    let title: String
    let icon: String
    @Binding var content: String
    var minHeight: CGFloat = 100
    @State private var isEditing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(title, systemImage: icon)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    isEditing.toggle()
                } label: {
                    Image(systemName: isEditing ? "checkmark" : "pencil")
                        .foregroundStyle(AppColor.paletteOrange)
                }
            }

            if isEditing {
                TextEditor(text: $content)
                    .font(.body)
                    .frame(minHeight: minHeight)
                    .padding(8)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.rect(cornerRadius: 12))
            } else {
                Text(content.isEmpty ? "Sin contenido" : content)
                    .font(.body)
                    .foregroundStyle(content.isEmpty ? .secondary : .primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.rect(cornerRadius: 12))
            }
        }
        .padding()
        .glassCard()
    }
}

struct AddTagSheet: View {
    @Bindable var idea: Idea
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allTags: [Tag]
    @State private var newTagName = ""
    @State private var selectedColor = AppColor.tagColors[0]

    var body: some View {
        NavigationStack {
            Form {
                Section("Nueva etiqueta") {
                    TextField("Nombre", text: $newTagName)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(AppColor.tagColors, id: \.self) { color in
                                Circle()
                                    .fill(Color(hex: color))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: selectedColor == color ? 3 : 0)
                                    )
                                    .shadow(color: Color(hex: color).opacity(0.4), radius: selectedColor == color ? 4 : 0)
                                    .onTapGesture {
                                        withAnimation { selectedColor = color }
                                    }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }

                if !allTags.isEmpty {
                    Section("Etiquetas existentes") {
                        ForEach(allTags) { tag in
                            Button {
                                if !(idea.tags?.contains(where: { $0.id == tag.id }) ?? false) {
                                    idea.tags?.append(tag)
                                }
                                dismiss()
                            } label: {
                                HStack {
                                    Circle()
                                        .fill(Color(hex: tag.colorHex))
                                        .frame(width: 10, height: 10)
                                    Text(tag.name)
                                    Spacer()
                                    if idea.tags?.contains(where: { $0.id == tag.id }) ?? false {
                                        Image(systemName: "checkmark")
                                            .foregroundStyle(AppColor.paletteOrange)
                                    }
                                }
                            }
                            .foregroundStyle(.primary)
                        }
                    }
                }
            }
            .navigationTitle("Etiquetas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Guardar") {
                        let tag = Tag(name: newTagName.trimmingCharacters(in: .whitespacesAndNewlines), colorHex: selectedColor)
                        modelContext.insert(tag)
                        idea.tags?.append(tag)
                        dismiss()
                    }
                    .disabled(newTagName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
