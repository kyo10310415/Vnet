import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { getCurrentUser, signOut } from '@/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ぶいねっと管理',
  description: 'VTuber案件の運用を半自動化するシステム「ぶいねっと管理」',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="flex min-h-screen">
          {user && <Sidebar canCreate={user.role === 'admin' || user.role === 'director'}>
            <p className="mb-2 text-sm text-gray-700">{user.name}</p>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
              <button className="text-sm text-indigo-700 underline">ログアウト</button>
            </form>
          </Sidebar>}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
