import { NextRequest, NextResponse } from "next/server"

interface AuthResult {
  success: boolean
  message?: string
  data?: {
    certNum: string
    date: string
    CI: string
    DI: string
    phoneNo: string
    phoneCorp: string
    birth: string
    gender: string
    nation: string
    name: string
    result: string
    certMet: string
    ip: string
    plusInfo: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apiToken, apiCertNum } = await request.json()

    // 파라미터 유효성 검사
    if (!apiToken || !apiCertNum) {
      return NextResponse.json(
        { success: false, message: "필수 파라미터가 누락되었습니다" },
        { status: 400 }
      )
    }

    // KMC API 호출 및 데이터 처리
    const verificationResult = await verifyWithKMC(apiToken, apiCertNum)

    if (verificationResult.success) {
      return NextResponse.json({
        success: true,
        message: "본인인증이 완료되었습니다",
        data: verificationResult.data
      })
    } else {
      return NextResponse.json({
        success: false,
        message: verificationResult.message || "본인인증에 실패했습니다"
      }, { status: 400 })
    }

  } catch (error) {
    console.error("본인인증 처리 중 오류:", error)
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// KMC 본인인증 API 호출 함수
async function verifyWithKMC(apiToken: string, apiCertNum: string): Promise<AuthResult> {
  try {
    // 현재 시간 생성 (YYYYMMDDHH24MISS)
    const now = new Date()
    const apiDate = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

    // KMC API 호출
    const response = await fetch("https://www.kmcert.com/kmcis/api/kmcisToken_api.jsp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        apiToken: apiToken,
        apiDate: apiDate,
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        message: "KMC API 호출 실패"
      }
    }

    const result = await response.json()

    // 결과 코드 확인
    if (result.result_cd === "APR01") {
      // 성공 - 복호화된 데이터 파싱
      const recCert = result.apiRecCert
      const parsedData = parseDecryptedData(recCert)
      
      return {
        success: true,
        data: parsedData
      }
    } else {
      // 실패 - 에러 메시지 반환
      let errorMessage = "본인인증에 실패했습니다"
      
      switch (result.result_cd) {
        case "APR02":
          errorMessage = "오류 - Token Expire"
          break
        case "APR03":
          errorMessage = "오류 - Token Not Found"
          break
        case "APR04":
          errorMessage = "오류 - API 요청시간 오류"
          break
        case "APR05":
          errorMessage = "오류 - API 토큰 오류"
          break
        case "APR06":
          errorMessage = "오류 - 본인인증 실패(3회 초과)"
          break
      }
      
      return {
        success: false,
        message: errorMessage
      }
    }

  } catch (error) {
    console.error("KMC API 호출 중 오류:", error)
    return {
      success: false,
      message: "본인인증 검증 중 오류가 발생했습니다"
    }
  }
}

// 복호화된 데이터 파싱 함수 (JSP의 파싱 로직을 JavaScript로 변환)
function parseDecryptedData(recCert: string) {
  // 실제 구현에서는 복호화 로직이 필요하지만, 
  // 여기서는 예시 데이터를 반환합니다
  // 실제로는 KMC에서 제공하는 복호화 라이브러리를 사용해야 합니다
  
  return {
    certNum: "CERT123456789",
    date: "20241201120000",
    CI: "CI_VALUE_HERE",
    DI: "DI_VALUE_HERE", 
    phoneNo: "01012345678",
    phoneCorp: "SKT",
    birth: "19900101",
    gender: "M",
    nation: "KOR",
    name: "홍길동",
    result: "Y",
    certMet: "휴대폰",
    ip: "192.168.1.1",
    plusInfo: ""
  }
} 