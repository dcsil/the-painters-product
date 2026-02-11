# AI Chatbot Analysis Tool

A Next.js application for mass data analysis of AI chatbot conversations to identify areas of improvement and potential response concerns.

## Overview

This tool allows users to upload JSON files containing AI chatbot conversation data, processes them through LLM analysis, and displays insights through an interactive dashboard.

### Key Features

- 🚀 **Drag-and-drop file upload** with validation
- ⚡ **Real-time processing status** with progress tracking
- 📊 **Interactive dashboard** with analysis insights
- 🎨 **Modern UI** with Tailwind CSS and dark mode support
- 💾 **SQLite database** with Prisma ORM
- 🔄 **Status polling** for asynchronous processing
- 📈 **Multiple analysis types**: hallucination detection, bias detection, toxicity analysis

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite with Prisma 7
- **Linting**: ESLint

## Project Structure

```
the-painters-product/
├── app/
│   ├── page.tsx                    # Home page
│   ├── upload/
│   │   └── page.tsx                # File upload page
│   ├── processing/[id]/
│   │   └── page.tsx                # Processing status page
│   ├── dashboard/[id]/
│   │   └── page.tsx                # Analysis dashboard
│   ├── uploads/
│   │   └── page.tsx                # Past uploads list
│   └── api/
│       ├── upload/
│       │   ├── route.ts            # Upload endpoint
│       │   └── [id]/route.ts       # Get upload status
│       ├── uploads/route.ts        # List all uploads
│       └── process/route.ts        # Processing endpoint (LLM integration point)
├── lib/
│   └── prisma.ts                   # Prisma client singleton
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── uploads/                        # Uploaded files storage
└── LLM_INTEGRATION_GUIDE.md       # Guide for LLM integration
```

## Database Schema

### User
- Stores user information
- Linked to uploads

### Upload
- Tracks uploaded conversation files
- Status: pending, processing, completed, failed
- Linked to analyses

### Analysis
- Stores analysis results from LLM processing
- Contains JSON results with summary, details, and recommendations

## Application Flow

1. **Upload** → User uploads a JSON file with conversation data
2. **Validation** → File is validated for correct format
3. **Processing** → Background processing analyzes the data
4. **Status Tracking** → User sees real-time processing updates
5. **Dashboard** → Results displayed with insights and visualizations

## Input Data Format

Upload JSON files with this structure:

```json
[
  {
    "id": "user",
    "content": "Hello, how are you?"
  },
  {
    "id": "assistant",
    "content": "I'm doing well, thank you!"
  }
]
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Navigate to the project directory:
```bash
cd the-painters-product
```

2. The dependencies are already installed. If you need to reinstall:
```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client (after schema changes)
npx prisma generate
```

## API Endpoints

### POST `/api/upload`
Upload a conversation file
- **Body**: FormData with file, fileName, fileSize
- **Returns**: `{ success: true, uploadId: string }`

### GET `/api/upload/[id]`
Get upload status and analysis results
- **Returns**: Upload object with analyses

### GET `/api/uploads`
List all uploads
- **Returns**: Array of upload objects

### POST `/api/process`
Trigger processing (internal use)
- **Body**: `{ uploadId, filePath, conversationData }`
- **Returns**: `{ success: true }`

## Pages

- `/` - Home page with features overview
- `/upload` - Upload conversation data
- `/processing/[id]` - View processing status
- `/dashboard/[id]` - View analysis results
- `/uploads` - List past uploads

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
