# Integration Guide for LLM Processing

This document explains how to integrate the LLM analysis logic into the backend API.

## Overview

The application has been set up with a complete frontend and backend infrastructure. Your task is to implement the actual LLM processing logic that analyzes the chatbot conversation data.

## Architecture Flow

1. **User uploads JSON file** → `/app/upload/page.tsx`
2. **File is saved and upload record created** → `/app/api/upload/route.ts`
3. **Processing is triggered** → `/app/api/process/route.ts` ← **YOUR INTEGRATION POINT**
4. **User sees processing status** → `/app/processing/[id]/page.tsx`
5. **Results are displayed** → `/app/dashboard/[id]/page.tsx`

## Database Schema

The database has three main models (see `prisma/schema.prisma`):

### Upload Model
- `id` - Unique identifier
- `userId` - Reference to user
- `fileName` - Name of uploaded file
- `fileSize` - File size in bytes
- `status` - Status: "pending" | "processing" | "completed" | "failed"
- `errorMessage` - Error message if status is "failed"

### Analysis Model
- `id` - Unique identifier
- `uploadId` - Reference to upload
- `analysisType` - Type of analysis (e.g., "hallucination", "gender_bias", "toxicity")
- `result` - JSON string containing detailed analysis results
- `confidence` - Confidence score (0-1)
- `detectedIssues` - Number of issues detected

## Where to Integrate Your LLM Processing

**File:** `/app/api/process/route.ts`

Currently, this endpoint contains mock/simulated processing. Replace the mock logic with your actual LLM analysis.

### Current Mock Implementation

```typescript
// TODO: Your teammate will implement the actual LLM processing here
// For now, simulate processing with a delay and create mock analyses

setTimeout(async () => {
  // Create mock analysis results
  const analysisTypes = ['hallucination', 'gender_bias', 'toxicity']
  
  for (const analysisType of analysisTypes) {
    await prisma.analysis.create({
      data: {
        uploadId: uploadId,
        analysisType: analysisType,
        result: JSON.stringify({
          summary: `Mock ${analysisType} analysis completed`,
          detectedIssues: Math.floor(Math.random() * 10),
          details: `Detailed ${analysisType} analysis results`,
          recommendations: [
            'Review flagged conversations',
            'Improve response guidelines',
          ]
        }),
        confidence: 0.85 + Math.random() * 0.15,
        detectedIssues: Math.floor(Math.random() * 10)
      }
    })
  }
  
  // Update upload status to completed
  await prisma.upload.update({
    where: { id: uploadId },
    data: { status: 'completed' }
  })
}, 5000)
```

### How to Replace with Real LLM Processing

1. **Remove the setTimeout** - Replace with your actual async processing logic
2. **Access the conversation data** - Use the `conversationData` parameter
3. **Call your LLM** - Integrate your LLM processing logic
4. **Save results** - Create Analysis records with the results
5. **Update status** - Mark upload as completed or failed

### Example Integration Structure

```typescript
export async function POST(request: NextRequest) {
  try {
    const { uploadId, filePath, conversationData } = await request.json()

    // Update status to processing
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'processing' }
    })

    // YOUR LLM PROCESSING LOGIC HERE
    // Option 1: Process synchronously (if quick)
    const results = await analyzeConversations(conversationData)
    
    // Option 2: Trigger background job (if slow)
    await queueProcessingJob(uploadId, conversationData)
    
    // Save analysis results
    for (const analysisType of ['hallucination', 'gender_bias', 'toxicity']) {
      const analysisResult = await yourLLMAnalysis(conversationData, analysisType)
      
      await prisma.analysis.create({
        data: {
          uploadId: uploadId,
          analysisType: analysisType,
          result: JSON.stringify({
            summary: analysisResult.summary,
            detectedIssues: analysisResult.issueCount,
            details: analysisResult.details,
            recommendations: analysisResult.recommendations,
            // Add any other fields your analysis produces
          }),
          confidence: analysisResult.confidence,
          detectedIssues: analysisResult.issueCount
        }
      })
    }

    // Update upload status to completed
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'completed' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Handle errors
    await prisma.upload.update({
      where: { id: uploadId },
      data: { 
        status: 'failed',
        errorMessage: error.message 
      }
    })
    
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Input Data Format

The conversation data will be an array of messages:

```json
[
  {
    "id": "user",
    "content": "What is the capital of France?"
  },
  {
    "id": "assistant",
    "content": "The capital of France is Paris."
  },
  {
    "id": "user",
    "content": "Tell me more about it."
  },
  {
    "id": "assistant",
    "content": "Paris is known for the Eiffel Tower..."
  }
]
```

## Output Data Format

Your analysis should produce results in this format:

```typescript
{
  summary: string          // Brief summary of findings
  detectedIssues: number   // Count of issues found
  details: string          // Detailed analysis description
  recommendations: string[] // List of recommendations
  // Add any additional fields you need
}
```

## Analysis Types

Current analysis types defined:
- `hallucination` - Detect inaccurate or fabricated information
- `gender_bias` - Detect gender bias in responses
- `toxicity` - Detect toxic or harmful content

You can add more analysis types as needed. Just make sure to:
1. Create Analysis records with the new type
2. Update the dashboard UI to display them appropriately

## Using Prisma Client

Import and use Prisma in your code:

```typescript
import { prisma } from '@/lib/prisma'

// Query uploads
const upload = await prisma.upload.findUnique({
  where: { id: uploadId },
  include: { analyses: true }
})

// Create analysis
await prisma.analysis.create({
  data: {
    uploadId: uploadId,
    analysisType: 'hallucination',
    result: JSON.stringify(results),
    confidence: 0.95,
    detectedIssues: 5
  }
})

// Update upload status
await prisma.upload.update({
  where: { id: uploadId },
  data: { status: 'completed' }
})
```

## Testing Your Integration

1. **Start the dev server**: `npm run dev`
2. **Upload a test file** via the UI
3. **Monitor the processing** page
4. **View results** on the dashboard

## Environment Variables

If you need API keys or configuration for your LLM:

1. Add them to `.env.local`:
```
OPENAI_API_KEY=your_key_here
# or whatever LLM service you're using
```

2. Access in your code:
```typescript
const apiKey = process.env.OPENAI_API_KEY
```

## Questions?

The frontend and backend infrastructure is complete. You only need to:
1. Replace the mock processing in `/app/api/process/route.ts`
2. Call your LLM with the conversation data
3. Format and save the results

Everything else (file upload, status tracking, dashboard display) is already handled!
