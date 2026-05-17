import Foundation
import SwiftData
import SwiftUI

enum IdeaStatus: String, Codable, CaseIterable {
    case draft = "Borrador"
    case inProgress = "En Progreso"
    case completed = "Completada"
    case archived = "Archivada"
}

@Model
final class Idea {
    @Attribute(.unique) var id: UUID
    var title: String
    var rawContent: String
    var summary: String
    var documentation: String
    var generatedImageData: Data?
    var status: String
    var createdAt: Date
    var updatedAt: Date
    var category: String
    var isFavorite: Bool

    @Relationship(deleteRule: .cascade, inverse: \TaskItem.idea)
    var tasks: [TaskItem]?

    @Relationship(deleteRule: .cascade, inverse: \TimelineEntry.idea)
    var timelineEntries: [TimelineEntry]?

    @Relationship(deleteRule: .cascade, inverse: \ChatMessage.idea)
    var chatMessages: [ChatMessage]?

    @Relationship(deleteRule: .nullify, inverse: \Tag.ideas)
    var tags: [Tag]?

    init(
        title: String = "",
        rawContent: String = "",
        summary: String = "",
        documentation: String = "",
        generatedImageData: Data? = nil,
        status: IdeaStatus = .draft,
        category: String = "General",
        isFavorite: Bool = false
    ) {
        self.id = UUID()
        self.title = title
        self.rawContent = rawContent
        self.summary = summary
        self.documentation = documentation
        self.generatedImageData = generatedImageData
        self.status = status.rawValue
        self.createdAt = Date()
        self.updatedAt = Date()
        self.category = category
        self.isFavorite = isFavorite
    }

    var ideaStatus: IdeaStatus {
        get { IdeaStatus(rawValue: status) ?? .draft }
        set { status = newValue.rawValue }
    }

    var progressPercentage: Int {
        guard let tasks = tasks, !tasks.isEmpty else { return 0 }
        let completed = tasks.filter { $0.isCompleted }.count
        return Int((Double(completed) / Double(tasks.count)) * 100)
    }

    var categoryColor: Color {
        AppColor.colorForCategory(category)
    }
}
