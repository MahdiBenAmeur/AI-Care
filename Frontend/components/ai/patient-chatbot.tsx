"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { usePatients } from "@/contexts/patient-context"
import { cn } from "@/lib/utils"
import { Bot, Loader2, Send, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface PatientChatbotProps {
  patientId: string
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function PatientChatbot({ patientId }: PatientChatbotProps) {
  const { toast } = useToast()
  const { getPatientById, getSessions } = usePatients()
  const patient = getPatientById(patientId)
  const sessions = getSessions(patientId)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI assistant for ${patient?.name}. You can ask me questions about this patient's medical history, treatments, or any other information in their records.`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const formData = new FormData();
      formData.append("message", input);

      const response = await fetch("http://localhost:8000/chat/", {
        method: "POST",
        body: formData,
      })
      // Send the message to the chat API with patient context


      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      // Extract the message from the response
      let responseText = data.response


      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat API error:', error)

      // Fallback to local response generation if API call fails
      const fallbackResponse = generateResponse(input, patient, sessions)

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fallbackResponse,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      toast({
        title: "API Connection Error",
        description: "Using local fallback response generation.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSendMessage()
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Patient Assistant
        </CardTitle>
        <CardDescription>Ask questions about {patient?.name}'s medical history, treatments, and more</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto rounded-md border p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <div className="flex items-center gap-2">
                  {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span className="font-medium">{message.role === "assistant" ? "AI Assistant" : "You"}</span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">AI Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder="Ask a question about this patient..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// Helper function to generate responses based on patient data
function generateResponse(question: string, patient: any, sessions: any[]): string {
  const questionLower = question.toLowerCase()

  // Basic patient information
  if (questionLower.includes("name") || questionLower.includes("who is")) {
    return `The patient's name is ${patient.name}.`
  }

  if (questionLower.includes("age") || questionLower.includes("how old")) {
    const birthDate = new Date(patient.dateOfBirth)
    const age = new Date().getFullYear() - birthDate.getFullYear()
    return `The patient is ${age} years old (born on ${birthDate.toLocaleDateString()}).`
  }

  if (questionLower.includes("gender") || questionLower.includes("sex")) {
    return `The patient's sex is recorded as ${patient.sex}.`
  }

  // Medical history and sessions
  if (questionLower.includes("last visit") || questionLower.includes("last appointment")) {
    if (patient.lastVisit) {
      return `The patient's last visit was on ${new Date(patient.lastVisit).toLocaleDateString()}.`
    } else {
      return "I don't have a record of the patient's last visit date."
    }
  }

  if (questionLower.includes("session") || questionLower.includes("appointment") || questionLower.includes("visit")) {
    if (sessions.length === 0) {
      return "There are no recorded sessions for this patient yet."
    }

    const sessionCount = sessions.length
    const latestSession = sessions[0]
    return `The patient has had ${sessionCount} recorded session(s). The most recent was "${latestSession.title}" on ${new Date(latestSession.date).toLocaleDateString()}.`
  }

  // Symptoms and conditions
  if (questionLower.includes("headache") || questionLower.includes("pain")) {
    const headacheSession = sessions.find(
      (s) => s.transcript.toLowerCase().includes("headache") || s.summary.toLowerCase().includes("headache"),
    )

    if (headacheSession) {
      return `The patient reported headaches during the session on ${new Date(headacheSession.date).toLocaleDateString()}. According to the notes, they were experiencing headaches 2-3 times weekly, which may be related to stress or potential iron deficiency.`
    } else {
      return "I don't see any records of the patient reporting headaches in the available session data."
    }
  }

  if (
    questionLower.includes("medication") ||
    questionLower.includes("prescription") ||
    questionLower.includes("drug")
  ) {
    const medicationInfo = sessions.flatMap((s) => s.prescriptions || []).filter(Boolean)

    if (medicationInfo.length > 0) {
      return `The patient has been prescribed the following medications:\n\n${medicationInfo.join("\n")}`
    } else {
      return "I don't see any medication prescriptions in the available records."
    }
  }

  if (questionLower.includes("summary") || questionLower.includes("overview")) {
    if (sessions.length === 0) {
      return `${patient.name} is a ${patient.sex.toLowerCase()} patient. There are no recorded sessions or medical history available yet.`
    }

    const latestSession = sessions[0]
    return `${patient.name} is a ${patient.sex.toLowerCase()} patient. Their most recent visit was for "${latestSession.title}" on ${new Date(latestSession.date).toLocaleDateString()}. ${latestSession.summary}`
  }

  // Default response for unknown questions
  return `I don't have specific information about that in ${patient.name}'s records. You might want to check their full medical history or ask them directly during your next session.`
}
