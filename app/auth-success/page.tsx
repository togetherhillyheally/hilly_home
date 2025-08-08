import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function AuthSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            본인인증 완료
          </h2>
          <p className="mt-2 text-gray-600">
            본인인증이 성공적으로 완료되었습니다.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/">
            <Button className="w-full">
              홈으로 돌아가기
            </Button>
          </Link>
          
          <Link href="/profile">
            <Button variant="outline" className="w-full">
              프로필 확인
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 