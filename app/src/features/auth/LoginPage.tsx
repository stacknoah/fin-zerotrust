import { useStore } from '@/store'
import { Mark } from '@/features/layout/Shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const login = useStore(s => s.login)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'radial-gradient(circle at 18% 22%, #e6eef9 0, transparent 42%), radial-gradient(circle at 84% 78%, #e3ebf5 0, transparent 38%), #f6f9fc' }}>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(10,37,64,.085) 1px, transparent 1.2px)', backgroundSize: '22px 22px' }} />
      <div className="relative grid w-[700px] max-w-full grid-cols-[300px_400px] overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(50,50,93,.05),0_13px_27px_-5px_rgba(50,50,93,.25),0_8px_16px_-8px_rgba(0,0,0,.3)] max-md:w-[400px] max-md:grid-cols-1">
        <div className="flex flex-col justify-center bg-navy px-9 py-10 text-white max-md:hidden">
          <div className="flex items-center text-[30px] font-bold tracking-tight"><Mark className="mr-2.5 size-[30px]" />살피<small className="ml-2.5 font-mono text-[10px] font-medium tracking-[.26em] text-[#adbdcc]">SALPI</small></div>
          <p className="mt-1.5 text-sm text-[#adbdcc]">망분리 경계 관제</p>
        </div>
        <form className="bg-card px-9 pt-10 pb-7" onSubmit={e => { e.preventDefault(); login() }}>
          <h1 className="text-xl font-semibold tracking-tight text-ink">로그인</h1>
          <label className="mt-5 mb-1.5 block text-[13px] font-medium text-body" htmlFor="lg-id">아이디</label>
          <Input id="lg-id" defaultValue="paymon.sec" autoComplete="off" className="h-10 bg-card" />
          <label className="mt-4 mb-1.5 block text-[13px] font-medium text-body" htmlFor="lg-pw">비밀번호</label>
          <Input id="lg-pw" type="password" defaultValue="demo-pass" autoComplete="off" className="h-10 bg-card" />
          <Button type="submit" className="mt-6 h-10 w-full text-sm font-semibold">로그인</Button>
          <p className="mt-4 text-center text-xs text-dim">데모 계정이 입력되어 있습니다</p>
        </form>
      </div>
    </div>
  )
}
