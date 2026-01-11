"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wifi, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { QrScanner } from "@/components/qr-scanner"

interface ConnectionScreenProps {
  onConnect: (socket: WebSocket) => void
}

export function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [ip, setIp] = useState("")
  const [port, setPort] = useState("")
  const [pin, setPin] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleManualConnect = async () => {
    if (!ip || !port || !pin) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos",
      })
      return
    }

    setIsConnecting(true)

    try {
      const wsUrl = `ws://${ip}:${port}?pin=${pin}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        toast({
          title: "Conectado",
          description: "Conexión establecida con el servidor",
        })
        setIsConnecting(false)
        onConnect(ws)
      }

      ws.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error de conexión",
          description:
            "No se pudo conectar al servidor. Verifica la IP, puerto y PIN. Asegúrate de usar HTTP (no HTTPS) si estás en la misma red local.",
        })
        setIsConnecting(false)
      }

      ws.onclose = () => {
        setIsConnecting(false)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al intentar conectar",
      })
      setIsConnecting(false)
    }
  }

  const handleQrScan = (data: string) => {
    try {
      console.log("Scanned QR Data:", data)
      const normalizedData = data.trim()

      if (normalizedData.toLowerCase().startsWith("ws://") || normalizedData.toLowerCase().startsWith("wss://")) {
        setIsConnecting(true)

        const ws = new WebSocket(normalizedData)

        ws.onopen = () => {
          toast({
            title: "Conectado",
            description: "Conexión establecida mediante código QR",
          })
          setIsConnecting(false)
          onConnect(ws)
        }

        ws.onerror = (e) => {
          console.error("WebSocket Error:", e)
          toast({
            variant: "destructive",
            title: "Error de conexión",
            description:
              "No se pudo conectar. Verifica que ambos dispositivos estén en la misma red y que NO estés usando HTTPS.",
          })
          setIsConnecting(false)
        }

        ws.onclose = () => {
          setIsConnecting(false)
        }
      } else {
        throw new Error(`Formato inválido: ${data.substring(0, 15)}...`)
      }
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `QR inválido: ${error.message || "Formato desconocido"}`,
      })
      setIsConnecting(false)
    }
  }

  const handleQrError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Error de escaneo",
      description: error,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <Toaster />
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Wifi className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-balance">Control Remoto PC</CardTitle>
          <CardDescription className="text-balance">Conecta tu móvil al servidor de escritorio</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">Escanear QR</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4">
              <QrScanner onScanSuccess={handleQrScan} onError={handleQrError} />
              <p className="text-xs text-muted-foreground text-center mt-4 text-balance">
                El servidor genera un QR con formato: ws://IP:PUERTO?pin=XXXX
              </p>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="ip" className="text-sm font-medium">
                  Dirección IP
                </label>
                <Input
                  id="ip"
                  type="text"
                  placeholder="192.168.0.12"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="port" className="text-sm font-medium">
                  Puerto
                </label>
                <Input
                  id="port"
                  type="text"
                  placeholder="8765"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="pin" className="text-sm font-medium">
                  PIN de Seguridad
                </label>
                <Input
                  id="pin"
                  type="text"
                  placeholder="9988"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="font-mono"
                />
              </div>

              <Button onClick={handleManualConnect} disabled={isConnecting} className="w-full mt-2">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center text-balance">
                Asegúrate de estar en la misma red Wi-Fi
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
