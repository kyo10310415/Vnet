// API responses remain JSON; authentication failures must not be displayed as
// successful edits or passed into components expecting an array of records.
export async function apiFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  if (response.status === 401) {
    window.location.assign('/login')
    throw new Error('セッションが終了しました。再度ログインしてください。')
  }
  if (response.status === 403) {
    throw new Error('この操作を行う権限がありません。')
  }
  return response
}
