"use client"

import { useState } from "react"
import { ConnectionScreen } from "@/components/connection-screen"
import { RemoteControl } from "@/components/remote-control"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  const handleConnect = (ws: WebSocket) => {
    setSocket(ws)
    setIsConnected(true)
  }

  const handleDisconnect = () => {
    if (socket) {
      socket.close()
      setSocket(null)
    }
    setIsConnected(false)
  }

  return (
    <main className="min-h-screen w-full">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <RemoteControl socket={socket} onDisconnect={handleDisconnect} />
      )}
    </main>
  )
}
