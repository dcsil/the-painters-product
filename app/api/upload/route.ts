import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)

    console.log('File info:', { fileName, fileSize, fileType: file?.type })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Buffer length:', buffer.length)

    // Parse and validate JSON
    let conversationData
    try {
      // Convert to UTF-8 string and remove BOM if present
      const text = buffer.toString('utf-8').replace(/^\uFEFF/, '').trim()
      console.log('First 100 chars:', text.substring(0, 100))
      conversationData = JSON.parse(text)
      console.log('JSON parsed successfully, items:', conversationData.length)
    } catch (error) {
      console.error('JSON parse error:', error)
      return NextResponse.json({ 
        error: 'Invalid JSON format. Please check your file.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    // Validate structure
    if (!Array.isArray(conversationData)) {
      return NextResponse.json({ error: 'JSON must be an array' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Save file to disk
    const timestamp = Date.now()
    const savedFileName = `${timestamp}-${fileName}`
    const filePath = join(uploadsDir, savedFileName)
    await writeFile(filePath, buffer)

    // Create a demo user (in production, you'd get this from auth)
    let user = await prisma.user.findFirst({
      where: { email: 'demo@example.com' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          name: 'Demo User'
        }
      })
    }

    // Create upload record in database
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        fileName: savedFileName,
        fileSize: fileSize,
        status: 'pending'
      }
    })

    console.log('Upload record created:', upload.id)

    // TODO: Trigger background processing job
    // This is where your teammate will integrate their LLM processing
    // For now, we'll simulate this with a webhook endpoint
    
    // Call the processing webhook (non-blocking)
    setTimeout(() => {
      fetch(`${request.nextUrl.origin}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: upload.id,
          filePath: filePath,
          conversationData: conversationData
        })
      }).catch(error => {
        console.error('Failed to trigger processing:', error)
      })
    }, 100) // Small delay to ensure response is sent first

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
