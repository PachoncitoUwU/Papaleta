import Foundation
import SwiftData

@Model
final class TimelineEntry {
    @Attribute(.unique) var id: UUID
    var imageData: Data?
    var aiDescription: String
    var userNote: String
    var createdAt: Date

    var idea: Idea?

    init(
        imageData: Data? = nil,
        aiDescription: String = "",
        userNote: String = "",
        createdAt: Date = Date()
    ) {
        self.id = UUID()
        self.imageData = imageData
        self.aiDescription = aiDescription
        self.userNote = userNote
        self.createdAt = createdAt
    }
}
