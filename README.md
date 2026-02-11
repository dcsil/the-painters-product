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
- Types: hallucination, gender_bias, toxicity, etc.
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

### Building for Production

```bash
npm run build
npm run start
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client (after schema changes)
npx prisma generate
```

## LLM Integration

The application is ready for LLM processing integration. See `LLM_INTEGRATION_GUIDE.md` for detailed instructions on how to integrate the actual analysis logic.

**Key integration point**: `/app/api/process/route.ts`

Currently contains mock processing that should be replaced with actual LLM analysis.

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

## Development Notes

### For Frontend/Backend Developer (You)
All pages, routing, and API endpoints are complete. The UI is fully functional with:
- File upload with drag-and-drop
- Progress tracking
- Dashboard with visualizations
- Responsive design with dark mode

### For LLM Integration Developer (Your Teammate)
Follow the `LLM_INTEGRATION_GUIDE.md` to integrate the actual analysis logic. The infrastructure is ready - just replace the mock processing in `/app/api/process/route.ts`.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features Implemented

✅ File upload with drag-and-drop UI  
✅ JSON validation and error handling  
✅ Database integration with Prisma  
✅ Processing status page with polling  
✅ Interactive analysis dashboard  
✅ Past uploads list view  
✅ Responsive design with Tailwind CSS  
✅ Dark mode support  
✅ API endpoints for all operations  
✅ Integration guide for LLM processing  

## Next Steps

1. Integrate actual LLM processing logic (see `LLM_INTEGRATION_GUIDE.md`)
2. Add user authentication (optional)
3. Add data export functionality
4. Deploy to production

## License

Course project for CSC454/491
