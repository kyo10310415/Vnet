import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <div className="mx-auto mt-20 max-w-sm rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="mb-3 text-xl font-bold">ぶいねっと管理にログイン</h1>
      <p className="mb-6 text-sm text-gray-600">管理者が登録したGoogleアカウントでログインしてください。利用できない場合は管理者へ連絡してください。</p>
      <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/' }) }}>
        <button className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white">Googleでログイン</button>
      </form>
    </div>
  )
}
