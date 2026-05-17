import SwiftUI
import SwiftData

struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]
    @Query(sort: \TaskItem.createdAt, order: .reverse) private var allTasks: [TaskItem]
    @Query(sort: \TimelineEntry.createdAt, order: .reverse) private var allEntries: [TimelineEntry]
    @Query(sort: \QuickNote.createdAt, order: .reverse) private var notes: [QuickNote]

    @State private var showNewIdea = false

    var recentIdeas: [Idea] { Array(ideas.prefix(3)) }
    var inProgressIdeas: [Idea] { ideas.filter { $0.ideaStatus == .inProgress } }
    var completedIdeas: [Idea] { ideas.filter { $0.ideaStatus == .completed } }
    var pendingTasks: [TaskItem] { allTasks.filter { !$0.isCompleted }.prefix(5).map { $0 } }

    var totalProgress: Int {
        guard !allTasks.isEmpty else { return 0 }
        return Int((Double(allTasks.filter(\.isCompleted).count) / Double(allTasks.count)) * 100)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    welcomeHeader
                    statsGrid
                    progressSection
                    recentIdeasSection
                    pendingTasksSection
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Papaleta")
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
            .sheet(isPresented: $showNewIdea) {
                NewIdeaView()
            }
        }
    }

    var welcomeHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greeting())
                .font(.title2.weight(.bold))
                .foregroundStyle(.primary)
            Text("Tienes \(ideas.count) ideas, \(inProgressIdeas.count) en progreso")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    func greeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 6..<12: return "Buenos dias"
        case 12..<18: return "Buenas tardes"
        default: return "Buenas noches"
        }
    }

    var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Ideas", value: "\(ideas.count)", icon: "lightbulb.fill", color: AppColor.paletteOrange)
            StatCard(title: "En Progreso", value: "\(inProgressIdeas.count)", icon: "bolt.fill", color: AppColor.paletteYellow)
            StatCard(title: "Completadas", value: "\(completedIdeas.count)", icon: "checkmark.seal.fill", color: AppColor.paletteGreen)
            StatCard(title: "Tareas", value: "\(allTasks.count)", icon: "checklist", color: AppColor.paletteBlue)
        }
    }

    var progressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundStyle(AppColor.paletteOrange)
                Text("Progreso General")
                    .font(.headline)
                Spacer()
                Text("\(totalProgress)%")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppColor.paletteOrange)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(.tertiarySystemFill))
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: 8)
                        .fill(
                            LinearGradient(
                                colors: [AppColor.paletteOrange, AppColor.paletteYellow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: max(0, geo.size.width * CGFloat(totalProgress) / 100), height: 12)
                        .animation(.easeInOut(duration: 0.8), value: totalProgress)
                }
            }
            .frame(height: 12)
        }
        .padding()
        .glassCard()
    }

    var recentIdeasSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(AppColor.paletteOrange)
                Text("Ideas Recientes")
                    .font(.headline)
                Spacer()
                NavigationLink("Ver todas") {
                    IdeasListView()
                }
                .font(.subheadline)
                .foregroundStyle(AppColor.paletteOrange)
            }

            if recentIdeas.isEmpty {
                EmptyMiniState(icon: "lightbulb", text: "Aun no tienes ideas")
            } else {
                ForEach(recentIdeas) { idea in
                    NavigationLink(value: idea) {
                        MiniIdeaCard(idea: idea)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    var pendingTasksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checklist")
                    .foregroundStyle(AppColor.paletteBlue)
                Text("Tareas Pendientes")
                    .font(.headline)
                Spacer()
            }

            if pendingTasks.isEmpty {
                EmptyMiniState(icon: "checkmark.circle", text: "No hay tareas pendientes")
            } else {
                ForEach(pendingTasks) { task in
                    MiniTaskRow(task: task)
                }
            }
        }
        .padding()
        .glassCard()
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundStyle(.primary)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .glassCard()
    }
}

struct MiniIdeaCard: View {
    let idea: Idea

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(idea.categoryColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: idea.statusIcon)
                    .font(.system(size: 18))
                    .foregroundStyle(idea.statusColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(idea.title.isEmpty ? "Sin titulo" : idea.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(idea.summary.isEmpty ? idea.rawContent.prefix(50) + "..." : idea.summary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if idea.progressPercentage > 0 {
                Text("\(idea.progressPercentage)%")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AppColor.paletteOrange)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppColor.paletteOrange.opacity(0.12))
                    .clipShape(.capsule)
            }
        }
        .padding()
        .glassCard()
    }
}

struct MiniTaskRow: View {
    @Bindable var task: TaskItem

    var body: some View {
        HStack(spacing: 12) {
            Button {
                if task.isCompleted {
                    task.taskStatus = .pending
                } else {
                    task.taskStatus = .completed
                }
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(task.isCompleted ? AppColor.paletteGreen : .gray)
            }

            Text(task.title)
                .font(.subheadline)
                .strikethrough(task.isCompleted)
                .foregroundStyle(task.isCompleted ? .secondary : .primary)

            Spacer()
        }
        .padding(.vertical, 8)
    }
}

struct EmptyMiniState: View {
    let icon: String
    let text: String

    var body: some View {
        HStack {
            Spacer()
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(.secondary.opacity(0.4))
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 20)
            Spacer()
        }
    }
}

struct IdeasListView: View {
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]
    @State private var searchText = ""

    var filteredIdeas: [Idea] {
        if searchText.isEmpty { return ideas }
        return ideas.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.summary.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(filteredIdeas) { idea in
                    NavigationLink(value: idea) {
                        MiniIdeaCard(idea: idea)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Mis Ideas")
        .searchable(text: $searchText, prompt: "Buscar ideas")
        .navigationDestination(for: Idea.self) { idea in
            IdeaDetailView(idea: idea)
        }
    }
}
