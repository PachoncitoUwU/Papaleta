import SwiftUI
import SwiftData

extension Idea {
    var statusColor: Color {
        switch ideaStatus {
        case .draft: return .gray
        case .inProgress: return AppColor.paletteOrange
        case .completed: return AppColor.paletteGreen
        case .archived: return AppColor.palettePurple
        }
    }

    var statusIcon: String {
        switch ideaStatus {
        case .draft: return "doc.text"
        case .inProgress: return "bolt.fill"
        case .completed: return "checkmark.seal.fill"
        case .archived: return "archivebox.fill"
        }
    }
}

extension TaskItem {
    var statusIcon: String {
        switch taskStatus {
        case .pending: return "circle"
        case .inProgress: return "circle.dashed"
        case .completed: return "checkmark.circle.fill"
        }
    }
}

extension Date {
    func relativeFormatted() -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: self, relativeTo: Date())
    }

    func formattedShort() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}
