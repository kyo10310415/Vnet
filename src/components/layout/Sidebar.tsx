'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: '🏠' },
  { href: '/projects', label: '案件一覧', icon: '📋' },
  { href: '/projects/new', label: '案件作成', icon: '➕' },
  { href: '/approvals', label: '承認待ち一覧', icon: '✅' },
  { href: '/activities', label: 'アクティビティ', icon: '📜' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white shadow-sm sticky top-0">
      {/* ロゴ */}
      <div className="border-b border-gray-200 px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎭</span>
          <div>
            <h1 className="text-sm font-bold text-gray-900">ぶいねっと管理</h1>
            <p className="text-xs text-gray-500">半自動運用システム</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* セパレーター */}
        <div className="my-4 border-t border-gray-200" />

        {/* ステータス説明 */}
        <div className="rounded-lg bg-yellow-50 p-3">
          <p className="mb-2 text-xs font-semibold text-yellow-800">承認ステータス</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400"></span>
              下書き
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
              承認待ち
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
              承認済み
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
              差し戻し
            </div>
          </div>
        </div>
      </nav>

      {/* フッター */}
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-400">⚠️ AI生成物は必ず承認が必要です</p>
      </div>
    </aside>
  )
}
