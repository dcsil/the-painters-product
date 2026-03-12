import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ChatInterface from '../components/ChatInterface'
import type { Message } from '../components/ChatInterface'

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

  const messages: Message[] = session.messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    monitoringData: m.monitoringData ?? undefined,
  }))

  return (
    <ChatInterface
      initialSessionId={session.id}
      initialMessages={messages}
      initialEnded={!!session.endedAt}
    />
  )
}
