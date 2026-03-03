import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from './prisma'

const BUILT_IN_GROUND_TRUTHS = [
  {
    name: 'TELUS Telecom',
    fileType: 'md',
    fileName: 'telus-ground-truth.md',
  },
]

export async function seedBuiltInGroundTruths() {
  for (const gt of BUILT_IN_GROUND_TRUTHS) {
    const existing = await prisma.groundTruth.findFirst({
      where: { name: gt.name, isBuiltIn: true },
    })

    if (!existing) {
      const content = readFileSync(
        join(process.cwd(), 'data', gt.fileName),
        'utf-8'
      )

      await prisma.groundTruth.create({
        data: {
          name: gt.name,
          content,
          fileType: gt.fileType,
          isBuiltIn: true,
          userId: null,
        },
      })
    }
  }
}
