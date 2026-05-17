import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Inicio", systemImage: "house.fill")
                }
                .tag(0)

            HomeView()
                .tabItem {
                    Label("Ideas", systemImage: "lightbulb.fill")
                }
                .tag(1)

            NotesView()
                .tabItem {
                    Label("Notas", systemImage: "note.text")
                }
                .tag(2)

            AllTimelineView()
                .tabItem {
                    Label("Timeline", systemImage: "clock.arrow.circlepath")
                }
                .tag(3)

            MoreView()
                .tabItem {
                    Label("Mas", systemImage: "square.grid.2x2")
                }
                .tag(4)
        }
        .tint(AppColor.paletteOrange)
    }
}

struct MoreView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    HStack {
                        Text("Mas Opciones")
                            .font(.title2.weight(.bold))
                        Spacer()
                    }

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        MoreCard(title: "Categorias", icon: "folder.fill", color: AppColor.paletteBlue, destination: CategoriesView())
                        MoreCard(title: "Asistente IA", icon: "sparkles", color: AppColor.palettePurple, destination: GlobalAssistantView())
                        MoreCard(title: "Buscar", icon: "magnifyingglass", color: AppColor.paletteGreen, destination: SearchView())
                        MoreCard(title: "Favoritos", icon: "heart.fill", color: AppColor.paletteRed, destination: FavoritesView())
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Acerca de")
                            .font(.headline)
                            .padding(.horizontal)

                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(AppColor.paletteOrange.opacity(0.15))
                                    .frame(width: 50, height: 50)
                                Image(systemName: "paintpalette.fill")
                                    .font(.title2)
                                    .foregroundStyle(AppColor.paletteOrange)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Papaleta")
                                    .font(.headline)
                                Text("Tu asistente creativo")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                        }
                        .padding()
                        .glassCard()
                    }
                    .padding(.top, 8)
                }
                .padding()
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Mas")
        }
    }
}

struct MoreCard<Destination: View>: View {
    let title: String
    let icon: String
    let color: Color
    let destination: Destination

    var body: some View {
        NavigationLink(destination: destination) {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 56, height: 56)
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundStyle(color)
                }
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .glassCard()
        }
        .buttonStyle(.plain)
    }
}
