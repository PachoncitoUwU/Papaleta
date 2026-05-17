import SwiftUI
import SwiftData

struct HomeView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]
    @State private var showNewIdea = false
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil
    @State private var selectedStatus: IdeaStatus? = nil

    let categories = ["General", "Tecnologia", "Arte", "Negocios", "Salud", "Educacion", "Hogar", "Viajes"]

    var filteredIdeas: [Idea] {
        var result = ideas
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.summary.localizedCaseInsensitiveContains(searchText) ||
                $0.rawContent.localizedCaseInsensitiveContains(searchText)
            }
        }
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }
        if let status = selectedStatus {
            result = result.filter { $0.ideaStatus == status }
        }
        return result
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    categoryScroll
                    statusFilter

                    if ideas.isEmpty {
                        EmptyStateView()
                    } else if filteredIdeas.isEmpty {
                        NoResultsView()
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredIdeas) { idea in
                                NavigationLink(value: idea) {
                                    IdeaCard(idea: idea)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Mis Ideas")
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Buscar ideas")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewIdea = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(AppColor.paletteOrange)
                    }
                }
            }
            .navigationDestination(for: Idea.self) { idea in
                IdeaDetailView(idea: idea)
            }
            .sheet(isPresented: $showNewIdea) {
                NewIdeaView()
            }
        }
    }

    var categoryScroll: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                CategoryChip(
                    title: "Todas",
                    color: AppColor.paletteOrange,
                    isSelected: selectedCategory == nil
                ) {
                    withAnimation { selectedCategory = nil }
                }

                ForEach(categories, id: \.self) { cat in
                    CategoryChip(
                        title: cat,
                        color: AppColor.colorForCategory(cat),
                        isSelected: selectedCategory == cat
                    ) {
                        withAnimation {
                            selectedCategory = selectedCategory == cat ? nil : cat
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
        .contentMargins(.horizontal, 16, for: .scrollContent)
    }

    var statusFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                StatusChip(status: nil, isSelected: selectedStatus == nil) {
                    withAnimation { selectedStatus = nil }
                }
                ForEach(IdeaStatus.allCases, id: \.self) { status in
                    StatusChip(status: status, isSelected: selectedStatus == status) {
                        withAnimation {
                            selectedStatus = selectedStatus == status ? nil : status
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
        .contentMargins(.horizontal, 16, for: .scrollContent)
    }
}

struct CategoryChip: View {
    let title: String
    let color: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                Text(title)
                    .font(.subheadline.weight(.medium))
            }
            .foregroundStyle(isSelected ? .white : color)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? color : color.opacity(0.12))
            .clipShape(.capsule)
        }
        .buttonStyle(.plain)
    }
}

struct StatusChip: View {
    let status: IdeaStatus?
    let isSelected: Bool
    let action: () -> Void

    var color: Color {
        guard let status = status else { return AppColor.paletteOrange }
        switch status {
        case .draft: return .gray
        case .inProgress: return AppColor.paletteOrange
        case .completed: return AppColor.paletteGreen
        case .archived: return AppColor.palettePurple
        }
    }

    var title: String {
        status?.rawValue ?? "Todos"
    }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(isSelected ? .white : color)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? color : color.opacity(0.12))
                .clipShape(.capsule)
        }
        .buttonStyle(.plain)
    }
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(AppColor.paletteOrange.opacity(0.12))
                    .frame(width: 100, height: 100)
                Image(systemName: "paintpalette.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(AppColor.paletteOrange)
            }

            Text("Sin ideas aun")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.primary)

            Text("Toca el boton + para capturar tu primera idea. Puedes escribir, hablar o subir fotos.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(.top, 100)
    }
}

struct NoResultsView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.secondary.opacity(0.4))
            Text("No se encontraron resultados")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.top, 100)
    }
}

struct IdeaCard: View {
    let idea: Idea

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(idea.categoryColor.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: idea.statusIcon)
                        .font(.system(size: 16))
                        .foregroundStyle(idea.statusColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(idea.title.isEmpty ? "Sin titulo" : idea.title)
                        .font(.headline)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text(idea.category)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(idea.categoryColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(idea.categoryColor.opacity(0.12))
                            .clipShape(.capsule)

                        Text(idea.ideaStatus.rawValue)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(idea.statusColor)
                    }
                }

                Spacer()

                if idea.isFavorite {
                    Image(systemName: "heart.fill")
                        .font(.caption)
                        .foregroundStyle(AppColor.paletteRed)
                }
            }

            if !idea.summary.isEmpty {
                Text(idea.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            if let tags = idea.tags, !tags.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(tags.prefix(3)) { tag in
                        Text(tag.name)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(Color(hex: tag.colorHex))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(hex: tag.colorHex).opacity(0.12))
                            .clipShape(.capsule)
                    }
                }
            }

            HStack {
                Label(idea.createdAt.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                if idea.progressPercentage > 0 {
                    HStack(spacing: 6) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color(.tertiarySystemFill))
                                    .frame(height: 6)
                                Capsule()
                                    .fill(AppColor.paletteOrange)
                                    .frame(width: max(0, geo.size.width * CGFloat(idea.progressPercentage) / 100), height: 6)
                            }
                        }
                        .frame(width: 50, height: 6)

                        Text("\(idea.progressPercentage)%")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(AppColor.paletteOrange)
                    }
                }
            }
        }
        .padding()
        .glassCard()
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}
