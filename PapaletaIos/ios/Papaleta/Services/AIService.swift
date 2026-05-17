import Foundation
import UIKit

enum AIError: LocalizedError {
    case authError
    case insufficientBalance
    case rateLimited
    case serverError(Int)
    case noContentReturned
    case decodingFailed
    case imageEncodingFailed
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .authError:           "AI features are currently unavailable. Please restart the app."
        case .insufficientBalance: "AI features are temporarily unavailable. Please try again later."
        case .rateLimited:         "Too many requests. Please wait a moment and try again."
        case .serverError:         "Something went wrong. Please try again."
        case .noContentReturned:   "No response received. Please try again."
        case .decodingFailed:      "Could not decode the response. Please try again."
        case .imageEncodingFailed: "Could not process the image. Please try again."
        case .invalidURL:          "Invalid service URL."
        }
    }
}

struct ChatResponse: Codable {
    struct Choice: Codable {
        struct Message: Codable {
            let content: String?
        }
        let message: Message
    }
    let choices: [Choice]
}

struct ImageV3Response: Codable {
    let images: [String]?
}

@MainActor
final class AIService {
    static let shared = AIService()

    private let chatModel = "anthropic/claude-haiku-4.5"
    private let imageModel = "openai/gpt-image-2"

    private var baseURL: String {
        let toolkitURL = Config.EXPO_PUBLIC_TOOLKIT_URL
        return "\(toolkitURL)/v2/vercel"
    }

    private var secretKey: String {
        Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
    }

    private init() {}

    // MARK: - Chat Completion

    func chatCompletion(messages: [[String: String]], temperature: Double = 0.7) async throws -> String {
        guard let url = URL(string: "\(baseURL)/v1/chat/completions") else {
            throw AIError.invalidURL
        }

        let body: [String: Any] = [
            "model": chatModel,
            "messages": messages,
            "temperature": temperature
        ]

        let request = try createRequest(url: url, body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        try handleStatusCode(httpResponse.statusCode)

        let result = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let content = result.choices.first?.message.content else {
            throw AIError.noContentReturned
        }
        return content
    }

    // MARK: - Ask Questions About Idea

    func askQuestions(about ideaContent: String) async throws -> [String] {
        let prompt = """
        Eres un asistente creativo llamado Papaleta. El usuario tiene esta idea:

        \"\"\"
        \(ideaContent)
        \"\"\"

        Hazle 3 preguntas cortas y relevantes que le ayuden a clarificar y desarrollar mejor su idea.
        Las preguntas deben ser en espanol, concisas y enfocadas en aspectos clave como: problema que resuelve, publico objetivo, diferenciador, o siguiente paso.
        Responde SOLO con las 3 preguntas, una por linea, sin numeracion ni texto adicional.
        """

        let messages = [["role": "user", "content": prompt]]
        let response = try await chatCompletion(messages: messages)
        return response.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    // MARK: - Generate Title

    func generateTitle(from content: String, answers: String = "") async throws -> String {
        let prompt = """
        Eres un asistente creativo. Genera un titulo corto y atractivo (maximo 6 palabras) para esta idea:

        \"\"\"
        \(content)
        \"\"\"

        \(answers.isEmpty ? "" : "Contexto adicional: \(answers)")

        Responde SOLO con el titulo, sin comillas ni texto adicional.
        """

        let messages = [["role": "user", "content": prompt]]
        return try await chatCompletion(messages: messages)
    }

    // MARK: - Generate Summary

    func generateSummary(from content: String) async throws -> String {
        let prompt = """
        Resume la siguiente idea en 2-3 oraciones claras y concisas en espanol:

        \"\"\"
        \(content)
        \"\"\"

        Responde SOLO con el resumen, sin texto adicional.
        """

        let messages = [["role": "user", "content": prompt]]
        return try await chatCompletion(messages: messages)
    }

    // MARK: - Generate Documentation

    func generateDocumentation(from content: String, title: String) async throws -> String {
        let prompt = """
        Genera una documentacion estructurada en espanol para esta idea llamada "\(title)":

        \"\"\"
        \(content)
        \"\"\"

        Incluye las siguientes secciones:
        1. Descripcion general
        2. Problema que resuelve
        3. Solucion propuesta
        4. Publico objetivo
        5. Caracteristicas principales
        6. Proximos pasos sugeridos

        Usa formato con encabezados claros y parrafos concisos.
        """

        let messages = [["role": "user", "content": prompt]]
        return try await chatCompletion(messages: messages)
    }

    // MARK: - Generate Pitch

    func generatePitch(from content: String, title: String) async throws -> String {
        let prompt = """
        Genera un pitch corto y persuasivo (maximo 100 palabras) para esta idea llamada "\(title)":

        \"\"\"
        \(content)
        \"\"\"

        El pitch debe ser en espanol, impactante y facil de entender para cualquier persona.
        Responde SOLO con el pitch.
        """

        let messages = [["role": "user", "content": prompt]]
        return try await chatCompletion(messages: messages)
    }

    // MARK: - Analyze Photo

    func analyzePhoto(imageData: Data, userNote: String = "") async throws -> String {
        guard let url = URL(string: "\(baseURL)/v1/chat/completions") else {
            throw AIError.invalidURL
        }

        let base64String = imageData.base64EncodedString()
        let mimeType = "image/jpeg"
        let dataUri = "data:\(mimeType);base64,\(base64String)"

        let prompt = userNote.isEmpty
            ? "Describe esta imagen de manera breve y concisa en espanol. Que muestra y que podria estar relacionado con un proyecto o idea?"
            : "Esta imagen esta relacionada con: \(userNote). Describe lo que ves brevemente en espanol."

        let body: [String: Any] = [
            "model": chatModel,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        ["type": "text", "text": prompt],
                        ["type": "image_url", "image_url": ["url": dataUri]]
                    ]
                ]
            ],
            "max_tokens": 500
        ]

        let request = try createRequest(url: url, body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        try handleStatusCode(httpResponse.statusCode)

        let result = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let content = result.choices.first?.message.content else {
            throw AIError.noContentReturned
        }
        return content
    }

    // MARK: - Generate Idea Image

    func generateIdeaImage(from content: String, title: String) async throws -> Data {
        guard let url = URL(string: "\(baseURL)/v3/ai/image-model") else {
            throw AIError.invalidURL
        }

        let prompt = "Create a clean, modern, conceptual illustration representing this idea: \(title). \(content.prefix(200)). Style: minimal, warm colors, professional app illustration."

        let body: [String: Any] = [
            "model": imageModel,
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "providerOptions": [String: Any]()
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(secretKey)", forHTTPHeaderField: "Authorization")
        request.setValue("0.0.1", forHTTPHeaderField: "ai-gateway-protocol-version")
        request.setValue("4", forHTTPHeaderField: "ai-image-model-specification-version")
        request.setValue(imageModel, forHTTPHeaderField: "ai-model-id")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 120

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        try handleStatusCode(httpResponse.statusCode)

        let result = try JSONDecoder().decode(ImageV3Response.self, from: data)
        guard let base64String = result.images?.first,
              let imageData = Data(base64Encoded: base64String) else {
            throw AIError.noContentReturned
        }
        return imageData
    }

    // MARK: - Assistant Chat

    func assistantChat(messages: [[String: String]], ideaContext: String) async throws -> String {
        let systemPrompt = """
        Eres Papaleta, un asistente creativo experto en ayudar a desarrollar ideas.
        Contexto de la idea actual: \(ideaContext)

        Tu rol es:
        - Hacer preguntas inteligentes para ayudar a desarrollar la idea
        - Sugerir proximos pasos concretos
        - Dar retroalimentacion constructiva
        - Ayudar a organizar tareas y priorizar
        - Motivar y mantener el enfoque

        Responde siempre en espanol, de manera concisa y util.
        """

        var allMessages = [["role": "system", "content": systemPrompt]]
        allMessages.append(contentsOf: messages)

        return try await chatCompletion(messages: allMessages)
    }

    // MARK: - Suggest Tasks

    func suggestTasks(from ideaContent: String) async throws -> [String] {
        let prompt = """
        Basandote en esta idea, sugiere una lista de 5-8 tareas concretas y ordenadas para llevarla a cabo:

        \"\"\"
        \(ideaContent)
        \"\"\"

        Responde SOLO con las tareas, una por linea, sin numeracion ni texto adicional.
        """

        let messages = [["role": "user", "content": prompt]]
        let response = try await chatCompletion(messages: messages)
        return response.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    // MARK: - Extract Text from Image (OCR-like)

    func extractTextFromImage(imageData: Data) async throws -> String {
        guard let url = URL(string: "\(baseURL)/v1/chat/completions") else {
            throw AIError.invalidURL
        }

        let base64String = imageData.base64EncodedString()
        let mimeType = "image/jpeg"
        let dataUri = "data:\(mimeType);base64,\(base64String)"

        let prompt = "Extrae TODO el texto visible en esta imagen. Si es una foto de un documento escrito a mano o impreso, transcribe el texto exactamente como aparece. Responde SOLO con el texto extraido, sin comentarios adicionales."

        let body: [String: Any] = [
            "model": chatModel,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        ["type": "text", "text": prompt],
                        ["type": "image_url", "image_url": ["url": dataUri]]
                    ]
                ]
            ],
            "max_tokens": 2000
        ]

        let request = try createRequest(url: url, body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        try handleStatusCode(httpResponse.statusCode)

        let result = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let content = result.choices.first?.message.content else {
            throw AIError.noContentReturned
        }
        return content
    }

    // MARK: - Generate Business Model Canvas

    func generateBusinessModel(from content: String, title: String) async throws -> String {
        let prompt = """
        Genera un modelo de negocio Canvas simplificado en espanol para esta idea llamada "\(title)":

        \"\"\"
        \(content)
        \"\"\"

        Incluye estas secciones:
        1. Propuesta de valor
        2. Segmentos de clientes
        3. Canales
        4. Fuentes de ingreso
        5. Recursos clave
        6. Actividades clave

        Responde con formato claro y conciso.
        """

        let messages = [["role": "user", "content": prompt]]
        return try await chatCompletion(messages: messages)
    }

    // MARK: - Helpers

    private func createRequest(url: URL, body: [String: Any]) throws -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(secretKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 60
        return request
    }

    private func handleStatusCode(_ code: Int) throws {
        switch code {
        case 200: break
        case 401: throw AIError.authError
        case 402: throw AIError.insufficientBalance
        case 429: throw AIError.rateLimited
        default: throw AIError.serverError(code)
        }
    }
}
