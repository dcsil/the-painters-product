import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <main className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            AI Chatbot Analysis Tool
          </h1>
          <p className="text-xl text-gray-600">
            Analyze mass AI chatbot conversation data to identify areas of improvement and potential response concerns
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Link
            href="/upload"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Conversation Data
          </Link>

          <Link
            href="/uploads"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-lg shadow-md transition-colors border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Past Uploads
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Hallucination Detection
            </h3>
            <p className="text-sm text-gray-600">
              Identify inaccurate or fabricated information in AI responses
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">⚖️</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Bias Detection
            </h3>
            <p className="text-sm text-gray-600">
              Analyze conversations for gender, racial, and other biases
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Quality Insights
            </h3>
            <p className="text-sm text-gray-600">
              Get comprehensive analytics and improvement recommendations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
