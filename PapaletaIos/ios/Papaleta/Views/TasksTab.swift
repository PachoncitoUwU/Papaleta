import SwiftUI
import SwiftData

struct TasksTab: View {
    @Bindable var idea: Idea
    @Environment(\.modelContext) private var modelContext
    @State private var newTaskTitle = ""
    @State private var showSuggestTasks = false
    @State private var isLoading = false

    var sortedTasks: [TaskItem] {
        (idea.tasks ?? []).sorted { $0.order < $1.order }
    }

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("\(sortedTasks.filter(\.isCompleted).count)/\(sortedTasks.count) completadas")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Button {
                    Task { await suggestTasks() }
                } label: {
                    Label("Sugerir", systemImage: "sparkles")
                        .font(.subheadline)
                        .foregroundStyle(AppColor.paletteOrange)
                }
                .disabled(isLoading)
            }

            if !sortedTasks.isEmpty {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color(.tertiarySystemFill))
                            .frame(height: 8)
                        Capsule()
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

            HStack(spacing: 12) {
                TextField("Nueva tarea...", text: $newTaskTitle)
                    .textFieldStyle(.roundedBorder)

                Button {
                    addTask()
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(AppColor.paletteOrange)
                }
                .disabled(newTaskTitle.isEmpty)
            }

            ForEach(sortedTasks) { task in
                TaskRow(task: task)
            }

            if sortedTasks.isEmpty {
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(AppColor.paletteOrange.opacity(0.12))
                            .frame(width: 72, height: 72)
                        Image(systemName: "checklist")
                            .font(.system(size: 32))
                            .foregroundStyle(AppColor.paletteOrange.opacity(0.6))
                    }
                    Text("Sin tareas aun")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Agrega tareas manualmente o pide sugerencias a la IA")
                        .font(.caption)
                        .foregroundStyle(.secondary.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)
            }
        }
    }

    private func addTask() {
        let task = TaskItem(title: newTaskTitle, order: sortedTasks.count)
        task.idea = idea
        modelContext.insert(task)
        newTaskTitle = ""
    }

    private func suggestTasks() async {
        isLoading = true
        do {
            let suggestions = try await AIService.shared.suggestTasks(from: idea.rawContent + "\n" + idea.summary)
            await MainActor.run {
                for (index, title) in suggestions.enumerated() {
                    let task = TaskItem(title: title, order: sortedTasks.count + index)
                    task.idea = idea
                    modelContext.insert(task)
                }
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

struct TaskRow: View {
    @Bindable var task: TaskItem
    @Environment(\.modelContext) private var modelContext

    var statusColor: Color {
        switch task.taskStatus {
        case .pending: return .gray
        case .inProgress: return AppColor.paletteOrange
        case .completed: return AppColor.paletteGreen
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button {
                toggleStatus()
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(task.isCompleted ? AppColor.paletteGreen : .gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.body)
                    .strikethrough(task.isCompleted)
                    .foregroundStyle(task.isCompleted ? .secondary : .primary)

                Menu {
                    ForEach(TaskStatus.allCases, id: \.self) { s in
                        Button {
                            task.taskStatus = s
                        } label: {
                            HStack {
                                Text(s.rawValue)
                                if task.taskStatus == s {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }

                    Divider()

                    Button(role: .destructive) {
                        modelContext.delete(task)
                    } label: {
                        Label("Eliminar", systemImage: "trash")
                    }
                } label: {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 6, height: 6)
                        Text(task.taskStatus.rawValue)
                            .font(.caption)
                    }
                    .foregroundStyle(statusColor)
                }
            }

            Spacer()
        }
        .padding()
        .glassCard()
    }

    private func toggleStatus() {
        if task.isCompleted {
            task.taskStatus = .pending
        } else {
            task.taskStatus = .completed
        }
    }
}
