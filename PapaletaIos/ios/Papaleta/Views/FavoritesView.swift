import SwiftUI
import SwiftData

struct FavoritesView: View {
    @Query(sort: \Idea.createdAt, order: .reverse) private var ideas: [Idea]

    var favoriteIdeas: [Idea] {
        ideas.filter { $0.isFavorite }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if favoriteIdeas.isEmpty {
                        EmptyStateView()
                            .padding(.top, 100)
                    } else {
                        ForEach(favoriteIdeas) { idea in
                            NavigationLink(value: idea) {
                                IdeaCard(idea: idea)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Favoritos")
            .navigationDestination(for: Idea.self) { idea in
                IdeaDetailView(idea: idea)
            }
        }
    }
}
