import Foundation
import SwiftData

@Model
final class QuickNote {
    @Attribute(.unique) var id: UUID
    var content: String
    var createdAt: Date
    var isPinned: Bool

    init(content: String = "", isPinned: Bool = false) {
        self.id = UUID()
        self.content = content
        self.createdAt = Date()
        self.isPinned = isPinned
    }
}