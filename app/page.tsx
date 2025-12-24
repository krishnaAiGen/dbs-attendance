import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'professor') {
      redirect('/professor/dashboard')
    } else {
      redirect('/student/dashboard')
    }
  } else {
    redirect('/login')
  }
}

