import SwiftUI

enum AppColor {
    static let paletteOrange = Color(hex: "#F5A623")
    static let paletteYellow = Color(hex: "#F8E71C")
    static let paletteRed = Color(hex: "#E74C3C")
    static let paletteTerracotta = Color(hex: "#D35400")
    static let paletteCream = Color(hex: "#FFF8E7")
    static let paletteWarmWhite = Color(hex: "#FFFAF0")
    static let paletteBrown = Color(hex: "#8B6914")
    static let paletteSoftBrown = Color(hex: "#A0522D")
    static let paletteGreen = Color(hex: "#27AE60")
    static let paletteBlue = Color(hex: "#3498DB")
    static let palettePurple = Color(hex: "#9B59B6")
    static let palettePink = Color(hex: "#E91E63")
    static let paletteDark = Color(hex: "#2C1810")
    static let paletteCard = Color(hex: "#FFF5E6")
    static let paletteCardDark = Color(hex: "#3D2B1F")

    static let categoryColors: [String: Color] = [
        "General": paletteOrange,
        "Tecnologia": paletteBlue,
        "Arte": palettePink,
        "Negocios": paletteGreen,
        "Salud": paletteRed,
        "Educacion": palettePurple,
        "Hogar": paletteTerracotta,
        "Viajes": paletteYellow
    ]

    static func colorForCategory(_ category: String) -> Color {
        categoryColors[category] ?? paletteOrange
    }

    static let tagColors: [String] = [
        "#F5A623", "#E74C3C", "#27AE60", "#3498DB",
        "#9B59B6", "#E91E63", "#D35400", "#1ABC9C"
    ]
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct GlassCard: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(colorScheme == .dark ? AppColor.paletteCardDark.opacity(0.8) : AppColor.paletteCard.opacity(0.9))
                    .background(.ultraThinMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(colorScheme == .dark ? 0.1 : 0.4), lineWidth: 1)
            )
    }
}

extension View {
    func glassCard() -> some View {
        modifier(GlassCard())
    }
}
