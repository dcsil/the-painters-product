import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ChatInterface from '../components/ChatInterface'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatSessionPage({ params }: Props) {
  const { id } = await params

  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!session) notFound()

  return (
    <ChatInterface
      initialSessionId={session.id}
      initialMessages={session.messages}
      initialEnded={!!session.endedAt}
    />
  )
}
