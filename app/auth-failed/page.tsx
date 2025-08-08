import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function AuthFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            본인인증 실패
          </h2>
          <p className="mt-2 text-gray-600">
            본인인증에 실패했습니다. 다시 시도해주세요.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/auth">
            <Button className="w-full">
              다시 시도하기
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 