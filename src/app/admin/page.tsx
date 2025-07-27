'use client'

import Logo from '@/components/Logo'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center px-6 py-6">
      <Logo size="lg" />
      
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-xl font-bold text-blue-600 mb-4">관리자 페이지</h1>
        <p className="text-gray-600 mb-6">
          Firebase 마이그레이션 작업 중입니다.<br/>
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="text-sm text-gray-500">
          8월 1일 런칭 전 완료 예정
        </div>
      </div>
    </div>
  )
}