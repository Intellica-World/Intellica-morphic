import { NextRequest, NextResponse } from 'next/server'

import { storeIntellicaUploadedFile } from '@/lib/intellica/uploads'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const result = await storeIntellicaUploadedFile(file)
    const response = NextResponse.json(
      {
        success: true,
        file: result.file,
        receipt: result.receipt
      },
      { status: 200 }
    )

    response.headers.set(
      'x-intellica-upload-hardening',
      result.receipt.hardeningApplied ? '1' : '0'
    )
    response.headers.set('x-intellica-upload-storage', result.receipt.storage)

    return response
  } catch (err: any) {
    console.error('Upload Error:', err)
    return NextResponse.json(
      { error: 'Upload failed', message: err.message },
      { status: 500 }
    )
  }
}
