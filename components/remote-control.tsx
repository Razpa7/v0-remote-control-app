"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MousePointer2, Keyboard, Mic, MicOff, Power, ChevronUp, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface RemoteControlProps {
  socket: WebSocket | null
  onDisconnect: () => void
}

export function RemoteControl({ socket, onDisconnect }: RemoteControlProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [textInput, setTextInput] = useState("")
  const touchpadRef = useRef<HTMLDivElement>(null)
  const lastTouchRef = useRef({ x: 0, y: 0 })
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  const sendMessage = useCallback(
    (message: object) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message))
        console.log("[v0] Sent message:", message)
      } else {
        console.log("[v0] WebSocket not ready")
      }
    },
    [socket],
  )

  // Handle touchpad movement
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]

    if (lastTouchRef.current.x !== 0 && lastTouchRef.current.y !== 0) {
      const dx = touch.clientX - lastTouchRef.current.x
      const dy = touch.clientY - lastTouchRef.current.y

      sendMessage({
        type: "mouse_move",
        dx: Math.round(dx * 2),
        dy: Math.round(dy * 2),
      })
    }

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = () => {
    lastTouchRef.current = { x: 0, y: 0 }
  }

  // Handle mouse clicks
  const handleClick = (button: "left" | "right") => {
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
    sendMessage({
      type: "mouse_click",
      button,
    })
  }

  // Handle scroll
  const handleScroll = (delta: number) => {
    sendMessage({
      type: "mouse_scroll",
      delta,
    })
  }

  // Handle keyboard
  const handleSendText = () => {
    if (textInput.trim()) {
      sendMessage({
        type: "text_type",
        text: textInput,
      })
      setTextInput("")
      toast({
        title: "Texto enviado",
        description: "El texto se ha escrito en el PC",
      })
    }
  }

  const handleKeyPress = (key: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(20)
    }
    sendMessage({
      type: "key_press",
      key,
    })
  }

  // Handle microphone
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        })

        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)

            // Convert to base64 and send
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64data = (reader.result as string).split(",")[1]
              sendMessage({
                type: "audio_stream",
                data: base64data,
              })
            }
            reader.readAsDataURL(event.data)
          }
        }

        mediaRecorder.start(100) // Send data every 100ms
        setIsRecording(true)

        toast({
          title: "Micrófono activado",
          description: "El audio se está transmitiendo",
        })
      } catch (error) {
        console.log("[v0] Microphone error:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo acceder al micrófono",
        })
      }
    } else {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current = null
      }
      setIsRecording(false)

      toast({
        title: "Micrófono desactivado",
        description: "Se detuvo la transmisión de audio",
      })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Handle WebSocket reconnection
  useEffect(() => {
    if (socket) {
      socket.onclose = () => {
        toast({
          variant: "destructive",
          title: "Desconectado",
          description: "Se perdió la conexión con el servidor",
        })
        onDisconnect()
      }

      socket.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error en la conexión WebSocket",
        })
      }
    }
  }, [socket, onDisconnect, toast])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">Conectado</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onDisconnect} className="text-destructive hover:text-destructive">
          <Power className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Touchpad Area */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        <Card
          ref={touchpadRef}
          className="flex-1 relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5 touch-none select-none"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <MousePointer2 className="w-12 h-12 text-primary/20" />
          </div>
          <div className="absolute top-4 left-4 right-4 text-center">
            <p className="text-xs text-muted-foreground">Desliza para mover el cursor</p>
          </div>
        </Card>

        {/* Mouse Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => handleClick("left")} className="h-16 text-base font-semibold">
            Click Izquierdo
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleClick("right")}
            className="h-16 text-base font-semibold"
          >
            Click Derecho
          </Button>
        </div>

        {/* Scroll Controls */}
        <div className="flex gap-3">
          <Button size="lg" variant="outline" onClick={() => handleScroll(1)} className="flex-1 h-14">
            <ChevronUp className="h-5 w-5 mr-2" />
            Scroll Arriba
          </Button>
          <Button size="lg" variant="outline" onClick={() => handleScroll(-1)} className="flex-1 h-14">
            <ChevronDown className="h-5 w-5 mr-2" />
            Scroll Abajo
          </Button>
        </div>

        {/* Quick Keys */}
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleKeyPress("enter")}>
            Enter
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleKeyPress("backspace")}>
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleKeyPress("esc")}>
            Esc
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleKeyPress("tab")}>
            Tab
          </Button>
        </div>

        {/* Keyboard Toggle */}
        {!showKeyboard ? (
          <Button size="lg" variant="outline" onClick={() => setShowKeyboard(true)} className="h-14">
            <Keyboard className="h-5 w-5 mr-2" />
            Abrir Teclado
          </Button>
        ) : (
          <Card className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe aquí..."
                className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                autoFocus
              />
              <Button onClick={handleSendText}>Enviar</Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowKeyboard(false)} className="w-full">
              Cerrar Teclado
            </Button>
          </Card>
        )}

        {/* Microphone */}
        <Button
          size="lg"
          variant={isRecording ? "default" : "outline"}
          onClick={toggleRecording}
          className={`h-16 text-base font-semibold ${isRecording ? "glow-effect animate-pulse" : ""}`}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              Detener Micrófono
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Activar Micrófono
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
