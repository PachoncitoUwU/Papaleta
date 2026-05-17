import Foundation
import SwiftData

enum MessageRole: String, Codable {
    case user = "user"
    case assistant = "assistant"
}

@Model
final class ChatMessage {
    @Attribute(.unique) var id: UUID
    var role: String
    var content: String
    var createdAt: Date

    var idea: Idea?

    init(
        role: MessageRole = .user,
        content: String = ""
    ) {
        self.id = UUID()
        self.role = role.rawValue
        self.content = content
        self.createdAt = Date()
    }

    var messageRole: MessageRole {
        get { MessageRole(rawValue: role) ?? .user }
        set { role = newValue.rawValue }
    }
}
