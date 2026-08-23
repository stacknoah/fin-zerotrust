import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Mark } from '@/features/layout/Shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconArrowRight } from '@tabler/icons-react'

export function LoginPage() {
  const login = useStore(s => s.login)
  const authed = useStore(s => s.authed)
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState(false)
  const dest = (loc.state as { from?: string } | null)?.from || '/map'
  if (authed) return <Navigate to={dest} replace />
  const enter = () => { login(); nav(dest, { replace: true }) }
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-5">
      <div className="dotgrid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative w-[380px] -translate-y-[6vh]">
        <div className="surface-float px-8 pt-9 pb-7">
          <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink"><Mark className="size-6" />살피</div>
          <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.01em] text-ink">콘솔 로그인</h1>
          <p className="mt-1 text-[13.5px] text-faint">망분리 경계 관제, 페이몬 정보보호팀</p>
          <Button onClick={enter} className="mt-6 h-11 w-full text-[14.5px] font-medium">데모 열기<IconArrowRight className="size-4" stroke={2} /></Button>
          <p className="mt-3 text-center text-[12.5px] text-dim"><span className="font-mono">demo</span>, 계정 입력 없이 바로 진입</p>
          {form ? (
            <form className="mt-5 border-t border-[rgba(19,23,34,.07)] pt-5" onSubmit={e => { e.preventDefault(); enter() }}>
              <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor="lg-id">아이디</label>
              <Input id="lg-id" defaultValue="paymon.sec" autoComplete="off" className="h-10 bg-card" />
              <label className="mt-3.5 mb-1.5 block text-[13px] font-medium text-body" htmlFor="lg-pw">비밀번호</label>
              <Input id="lg-pw" type="password" defaultValue="demo-pass" autoComplete="off" className="h-10 bg-card" />
              <Button type="submit" variant="outline" className="mt-5 h-10 w-full text-sm font-medium">로그인</Button>
            </form>
          ) : (
            <button onClick={() => setForm(true)} className="mt-5 w-full border-t border-[rgba(19,23,34,.07)] pt-4 text-center text-[13px] font-medium text-body underline-offset-4 transition hover:text-ink hover:underline">계정으로 로그인</button>
          )}
        </div>
      </div>
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-xs text-dim">합성 데이터 기반 데모. 법적 판단을 대행하지 않습니다</p>
    </div>
  )
}
