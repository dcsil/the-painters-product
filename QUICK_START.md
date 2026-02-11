# Quick Start Guide

## Testing the Application

### 1. Start the Development Server

Open your terminal in the project root and run:

```bash
cd the-painters-product
npm run dev
```

The application will start at `http://localhost:3000`

### 2. Test the Upload Flow

1. Open your browser to `http://localhost:3000`
2. Click "Upload Conversation Data"
3. Either:
   - Drag and drop `sample-conversation.json` into the upload area
   - Or click to browse and select `sample-conversation.json`
4. Click "Start Analysis"

### 3. Watch the Processing

You'll be automatically redirected to the processing page where you can see:
- Real-time progress updates
- Status of each processing step
- The page polls the backend every 2 seconds for updates

### 4. View the Dashboard

Once processing is complete (takes ~5 seconds with mock data), you'll be redirected to the dashboard where you can:
- See summary statistics (total issues, confidence, analysis types)
- Click on different analysis types (hallucination, gender bias, toxicity)
- View detailed results, recommendations, and confidence scores
- Export or print the report

### 5. View Past Uploads

- From the home page, click "View Past Uploads"
- See all your previous uploads with their status
- Click "View Dashboard" on completed uploads to see their results again

## Database Inspection

To view your database visually:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- Browse all tables (User, Upload, Analysis)
- View all records
- Edit data directly
- Inspect relationships

## File Locations

### Frontend Pages
- Home: `the-painters-product/app/page.tsx`
- Upload: `the-painters-product/app/upload/page.tsx`
- Processing: `the-painters-product/app/processing/[id]/page.tsx`
- Dashboard: `the-painters-product/app/dashboard/[id]/page.tsx`
- Uploads List: `the-painters-product/app/uploads/page.tsx`

### API Endpoints
- Upload File: `the-painters-product/app/api/upload/route.ts`
- Process Data: `the-painters-product/app/api/process/route.ts` ⭐ **LLM Integration Point**
- Get Upload: `the-painters-product/app/api/upload/[id]/route.ts`
- List Uploads: `the-painters-product/app/api/uploads/route.ts`

### Database
- Schema: `prisma/schema.prisma`
- Database file: `prisma/dev.db`
- Migrations: `prisma/migrations/`

### Uploaded Files
- Location: `uploads/` (created automatically)

## Common Issues & Solutions

### Port Already in Use
If port 3000 is already in use:
```bash
# Kill the process using port 3000
# Or specify a different port
PORT=3001 npm run dev
```

### Database Issues
Reset the database:
```bash
npx prisma migrate reset
```

### Prisma Client Issues
Regenerate the client:
```bash
npx prisma generate
```

## Mock Data Behavior

Currently, the processing uses mock data that:
- Takes 5 seconds to complete
- Creates 3 analysis types (hallucination, gender_bias, toxicity)
- Generates random issue counts and confidence scores
- This is in `/app/api/process/route.ts` and should be replaced with real LLM logic

## Next Steps for Development

1. **For You**: The frontend/backend is complete and working!
2. **For Your Teammate**: See `LLM_INTEGRATION_GUIDE.md` to replace mock processing with real LLM analysis

## Testing Different Scenarios

### Test File Upload Validation
Try uploading:
- A non-JSON file (should show error)
- A file larger than 10MB (should show error)
- An empty JSON file (should show error)
- Invalid JSON structure (should show error)

### Test Status Tracking
- Upload a file
- Navigate away from processing page
- Go to "View Past Uploads" to see the status
- Click "View Progress" to return to the processing page

### Test Dashboard
- Complete an upload
- Click on different analysis type cards
- Check the export/print functionality

## Viewing Logs

Monitor the terminal where `npm run dev` is running to see:
- API requests
- Database queries
- Processing status updates
- Any errors

## Creating Your Own Test Data

Create a JSON file with this structure:

```json
[
  {
    "id": "user",
    "content": "Your message here"
  },
  {
    "id": "assistant",
    "content": "AI response here"
  }
]
```

The `id` field should be either "user" or "assistant".

## Questions?

- Check the main `README.md` for full documentation
- Check `LLM_INTEGRATION_GUIDE.md` for integration details
- Check `PRISMA_SETUP.md` for database details

## Useful Commands Cheat Sheet

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Check for errors

# Database
npx prisma studio       # Open database GUI
npx prisma generate     # Regenerate client
npx prisma migrate dev  # Create migration
npx prisma db push      # Push schema changes

# Prisma
npx prisma format       # Format schema file
```

Happy coding! 🚀
