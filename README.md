# AI Chatbot Analysis Tool

A Next.js application for mass data analysis of AI chatbot conversations to identify areas of improvement and potential response concerns.

## Overview

This tool allows users to upload JSON files containing AI chatbot conversation data, processes them through Gemini LLM analysis, and displays insights through an interactive dashboard.

### Key Features

- 🚀 **Drag-and-drop file upload** with validation
- ⚡ **Real-time processing status** with progress tracking
- 📊 **Interactive dashboard** with hallucination analysis insights
- 🔍 **Hallucination detection**: self-contradictions, overconfidence, fabricated citations, unverified facts
- ⚠ **Numerical impact highlighting**: flags specific dollar amounts, percentages, and dates involved in hallucinations
- 🎨 **Modern UI** with Tailwind CSS
- 💾 **SQLite database** with Prisma ORM

### Planned Future Analysis Types

- ⚖️ **Gender Bias Detection** — flag differential treatment based on user gender cues
- 🚨 **Toxicity Detection** — identify harmful or inappropriate assistant responses

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite with Prisma 7
- **LLM**: Google Gemini (`@google/generative-ai`)
- **Linting**: ESLint

## Project Structure

```
the-painters-product/
├── app/
│   ├── page.tsx                    # Home page
│   ├── upload/page.tsx             # File upload page
│   ├── processing/[id]/page.tsx    # Processing status page
│   ├── dashboard/[id]/page.tsx     # Hallucination analysis dashboard
│   ├── uploads/page.tsx            # Past uploads list
│   └── api/
│       ├── upload/route.ts         # Upload endpoint
│       ├── upload/[id]/route.ts    # Get upload status
│       ├── uploads/route.ts        # List all uploads
│       └── process/route.ts        # Gemini LLM processing endpoint
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   └── gemini.ts                   # Gemini client, prompt builder, and types
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── uploads/                        # Uploaded files storage
├── sample-telus-clean.json                # Test: clean conversation
├── sample-telus-one-hallucination.json    # Test: single hallucination
└── sample-telus-many-hallucinations.json  # Test: multiple hallucination types
```

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm
- A Google Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com))

### Installation

1. Navigate to the app directory:
```bash
cd the-painters-product
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the project root:
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Management

```bash
npx prisma studio              # Open Prisma Studio (database GUI)
npx prisma migrate dev         # Create a new migration
npx prisma generate            # Regenerate Prisma Client
```

## Input Data Format

Upload JSON files with this structure:

```json
[
  { "id": "user", "content": "Hello, what plans do you offer?" },
  { "id": "assistant", "content": "We have several plans available..." }
]
```

## Application Flow

1. **Upload** → User uploads a JSON file with conversation data
2. **Validation** → File is validated for correct format
3. **Processing** → Gemini LLM analyzes the conversation for hallucinations
4. **Status Tracking** → User sees real-time processing updates
5. **Dashboard** → Results displayed with hallucination rate, issue breakdown, and flagged turn details

## API Endpoints

### POST `/api/upload`
Upload a conversation file
- **Body**: FormData with `file`, `fileName`, `fileSize`
- **Returns**: `{ success: true, uploadId: string }`

### GET `/api/upload/[id]`
Get upload status and analysis results
- **Returns**: Upload object with analyses

### GET `/api/uploads`
List all uploads
- **Returns**: Array of upload objects

### POST `/api/process`
Trigger Gemini processing (called internally after upload)
- **Body**: `{ uploadId, filePath, conversationData }`
- **Returns**: `{ success: true }`

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
