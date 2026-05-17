import Foundation
import SwiftData

enum TaskStatus: String, Codable, CaseIterable {
    case pending = "Pendiente"
    case inProgress = "En Progreso"
    case completed = "Completada"
}

@Model
final class TaskItem {
    @Attribute(.unique) var id: UUID
    var title: String
    var status: String
    var createdAt: Date
    var completedAt: Date?
    var order: Int

    var idea: Idea?

    init(
        title: String = "",
        status: TaskStatus = .pending,
        order: Int = 0
    ) {
        self.id = UUID()
        self.title = title
        self.status = status.rawValue
        self.createdAt = Date()
        self.order = order
    }

    var taskStatus: TaskStatus {
        get { TaskStatus(rawValue: status) ?? .pending }
        set {
            status = newValue.rawValue
            if newValue == .completed {
                completedAt = Date()
            } else {
                completedAt = nil
            }
        }
    }

    var isCompleted: Bool {
        taskStatus == .completed
    }
}
