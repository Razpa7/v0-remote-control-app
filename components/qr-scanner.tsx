"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, CameraOff } from "lucide-react"

interface QrScannerProps {
  onScanSuccess: (data: string) => void
  onError: (error: string) => void
}

export function QrScanner({ onScanSuccess, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      setStream(mediaStream)
      setIsScanning(true)

      // Start scanning
      scanIntervalRef.current = setInterval(() => {
        scanQRCode()
      }, 500)
    } catch (err) {
      console.error("[v0] Camera access error:", err)
      onError("No se pudo acceder a la cámara. Verifica los permisos.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Use jsQR library to decode QR code
    try {
      // @ts-ignore - jsQR will be loaded from CDN
      if (typeof window !== "undefined" && window.jsQR) {
        // @ts-ignore
        const code = window.jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          console.log("[v0] QR Code detected:", code.data)
          stopCamera()
          onScanSuccess(code.data)
        }
      }
    } catch (err) {
      console.error("[v0] QR scan error:", err)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full aspect-square max-w-sm rounded-lg overflow-hidden border-2 border-primary/30 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Camera className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-primary/50 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      {!isScanning ? (
        <Button onClick={startCamera} className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Activar Cámara
        </Button>
      ) : (
        <Button onClick={stopCamera} variant="destructive" className="w-full">
          <CameraOff className="mr-2 h-4 w-4" />
          Detener Escaneo
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center text-balance">
        Apunta la cámara al código QR del servidor
      </p>
    </div>
  )
}
