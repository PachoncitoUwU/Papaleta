import SwiftUI
import SwiftData

struct CategoriesView: View {
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]

    let categories = ["General", "Tecnologia", "Arte", "Negocios", "Salud", "Educacion", "Hogar", "Viajes"]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(categories, id: \.self) { category in
                        let count = ideas.filter { $0.category == category }.count
                        let progress = categoryProgress(for: category)
                        CategoryCard(
                            category: category,
                            color: AppColor.colorForCategory(category),
                            count: count,
                            progress: progress
                        )
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Categorias")
        }
    }

    func categoryProgress(for category: String) -> Int {
        let categoryIdeas = ideas.filter { $0.category == category }
        let totalTasks = categoryIdeas.compactMap { $0.tasks }.flatMap { $0 }
        guard !totalTasks.isEmpty else { return 0 }
        return Int((Double(totalTasks.filter(\.isCompleted).count) / Double(totalTasks.count)) * 100)
    }
}

struct CategoryCard: View {
    let category: String
    let color: Color
    let count: Int
    let progress: Int

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 56, height: 56)
                Image(systemName: categoryIcon)
                    .font(.title2)
                    .foregroundStyle(color)
            }

            Text(category)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)

            Text("\(count) ideas")
                .font(.caption)
                .foregroundStyle(.secondary)

            if progress > 0 {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color(.tertiarySystemFill))
                            .frame(height: 4)
                        Capsule()
                            .fill(color)
                            .frame(width: max(0, geo.size.width * CGFloat(progress) / 100), height: 4)
                    }
                }
                .frame(height: 4)
                .padding(.horizontal, 8)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .glassCard()
    }

    var categoryIcon: String {
        switch category {
        case "Tecnologia": return "cpu"
        case "Arte": return "paintbrush"
        case "Negocios": return "briefcase"
        case "Salud": return "heart.fill"
        case "Educacion": return "book.fill"
        case "Hogar": return "house.fill"
        case "Viajes": return "airplane"
        default: return "lightbulb"
        }
    }
}
