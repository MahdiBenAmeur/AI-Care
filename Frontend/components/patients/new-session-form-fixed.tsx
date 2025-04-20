"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { usePatients } from "@/contexts/patient-context"
import { useTranscription } from "@/contexts/transcription-context"
import { FileAudio, Loader2, Mic, Save, Send, Square, Volume2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface NewSessionFormProps {
  patientId: string
  onSessionComplete: () => void
}

export function NewSessionForm({ patientId, onSessionComplete }: NewSessionFormProps) {
  const { toast } = useToast()
  const { addSession } = usePatients()
  const {
    isTranscribing,
    transcript,
    audioRecording,
    isRecordingAudio,
    startTranscription,
    stopTranscription,
    resetTranscription,
    startAudioRecording,
    stopAudioRecording,
    generateSummary,
  } = useTranscription()

  const [sessionTitle, setSessionTitle] = useState("")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showSendButton, setShowSendButton] = useState(false)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Helper function to update transcript with custom text
  const updateTranscriptWithText = (text: string) => {
    // First reset the current transcript
    resetTranscription()

    // Then start a new transcription session
    startTranscription()

    // Wait a bit and then stop it to prevent the mock data from appearing
    setTimeout(() => {
      stopTranscription()

      // Directly update the textarea content
      // This is a hack for demo purposes since we don't have direct access to setTranscript
      const transcriptElement = document.getElementById("transcript") as HTMLTextAreaElement
      if (transcriptElement) {
        transcriptElement.value = text
      }
    }, 100)
  }

  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [timer])

  // Create URL for audio blob when recording is available
  useEffect(() => {
    if (audioRecording) {
      // Revoke previous URL to avoid memory leaks
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }

      // Create a new URL for the audio blob
      const url = URL.createObjectURL(audioRecording)
      setAudioUrl(url)

      // Show the send button when we have an audio recording
      setShowSendButton(true)
    } else {
      // Hide the send button when there's no audio recording
      setShowSendButton(false)
    }

    // Cleanup function to revoke URL when component unmounts
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioRecording, audioUrl])

  const handleStartTranscription = () => {
    startTranscription()

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1)
    }, 60000) // Update every minute

    setTimer(interval)

    toast({
      title: "Transcription Started",
      description: "The session is now being recorded and transcribed.",
    })
  }

  const handleStopTranscription = () => {
    stopTranscription()

    if (timer) {
      clearInterval(timer)
      setTimer(null)
    }

    toast({
      title: "Transcription Stopped",
      description: "The session recording has been paused.",
    })
  }

  // Audio recording handlers
  const handleStartAudioRecording = async () => {
    try {
      await startAudioRecording()

      toast({
        title: "Audio Recording Started",
        description: "Recording audio from your microphone.",
      })
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const handleStopAudioRecording = async () => {
    try {
      await stopAudioRecording()

      toast({
        title: "Audio Recording Stopped",
        description: "Audio recording has been saved.",
      })
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "An error occurred while stopping the recording.",
        variant: "destructive",
      })
    }
  }

  // Handler for sending the audio file to the backend and getting a transcription
  const handleSendAudio = async () => {
    if (!audioRecording) {
      toast({
        title: "Error",
        description: "No audio recording found.",
        variant: "destructive",
      })
      return
    }

    // Set processing state
    setIsProcessingAudio(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock transcription result
      const mockTranscriptions = [
        "Doctor: Good morning, how are you feeling today?\n\nPatient: I've been having some headaches and trouble sleeping.\n\nDoctor: I'm sorry to hear that. How long has this been going on?\n\nPatient: For about two weeks now. It's affecting my work.",
        "Doctor: Can you describe your symptoms in more detail?\n\nPatient: I have a throbbing pain on the right side of my head, and I'm finding it hard to fall asleep at night.\n\nDoctor: Are you experiencing any other symptoms like nausea or sensitivity to light?\n\nPatient: Yes, sometimes bright lights make it worse.",
        "Doctor: Have you been under more stress lately?\n\nPatient: Yes, I've been working on a big project with tight deadlines.\n\nDoctor: That could be contributing to your symptoms. Let's talk about some strategies to manage your stress and improve your sleep.",
      ]

      // Randomly select one of the mock transcriptions
      const randomIndex = Math.floor(Math.random() * mockTranscriptions.length)
      const transcriptionText = mockTranscriptions[randomIndex]

      // Update the transcript using our helper function
      updateTranscriptWithText(transcriptionText)

      toast({
        title: "Transcription Complete",
        description: "Audio has been successfully transcribed.",
      })
    } catch (error) {
      toast({
        title: "Transcription Failed",
        description: "Failed to process the audio file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingAudio(false)
    }
  }

  const handleFinishSession = async () => {
    if (!sessionTitle) {
      toast({
        title: "Error",
        description: "Please enter a session title.",
        variant: "destructive",
      })
      return
    }

    // Get the transcript from the textarea (since we might have updated it directly)
    const transcriptElement = document.getElementById("transcript") as HTMLTextAreaElement
    const currentTranscript = transcriptElement ? transcriptElement.value : transcript

    if (!currentTranscript || currentTranscript.trim().length === 0) {
      toast({
        title: "Error",
        description: "The transcript is empty. Please record a session first.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingSummary(true)

    try {
      // In a real app, this would call an LLM to generate a summary
      const summary = await generateSummary(currentTranscript)

      addSession(patientId, {
        id: crypto.randomUUID(),
        title: sessionTitle,
        date: new Date().toISOString(),
        duration: sessionDuration || 1,
        transcript: currentTranscript,
        summary: summary.text,
        keyPoints: summary.keyPoints,
        prescriptions: summary.prescriptions,
        audioUrl: audioUrl || undefined,
      })

      toast({
        title: "Session Completed",
        description: "The session has been saved and summarized successfully.",
      })

      // Reset the form
      setSessionTitle("")
      setSessionDuration(0)
      //resetTranscription()

      // Clean up audio URL and reset send button state
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        setShowSendButton(false)
      }

      onSessionComplete()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              placeholder="Enter a title for this session"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
          </div>

          {/* Audio Recording Controls */}
          <div className="flex items-center justify-between rounded-md bg-muted p-4">
            <div className="flex items-center gap-2">
              {isRecordingAudio ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                  <Mic className="h-4 w-4 animate-pulse" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground">
                  <FileAudio className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {isRecordingAudio ? "Audio recording in progress" : "Audio recording paused"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {audioRecording ? "Audio recording saved" : "Start recording to capture audio"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isRecordingAudio ? (
                <Button variant="outline" size="icon" onClick={handleStopAudioRecording} className="h-8 w-8">
                  <Square className="h-4 w-4" color="red" />
                  <span className="sr-only">Stop Audio Recording</span>
                </Button>
              ) : (
                <Button variant="default" size="icon" onClick={handleStartAudioRecording} className="h-8 w-8">
                  <Mic className="h-4 w-4" />
                  <span className="sr-only">Start Audio Recording</span>
                </Button>
              )}
            </div>
          </div>

          {/* Audio Playback */}
          {audioUrl && (
            <div className="mt-4 rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <p className="font-medium">Recorded Audio</p>
                </div>
                {showSendButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendAudio}
                    disabled={isProcessingAudio}
                    className="flex items-center gap-1"
                  >
                    {isProcessingAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Transcribe Audio
                      </>
                    )}
                  </Button>
                )}
              </div>
              <audio ref={audioRef} src={audioUrl} controls className="w-full" />
            </div>
          )}

          {/* Transcript Display */}
          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript</Label>
            <Textarea
              id="transcript"
              placeholder="Transcript will appear here after processing the audio..."
              value={transcript}
              readOnly
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This transcript is generated from the audio recording and may contain errors.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetTranscription}>
            Clear Transcript
          </Button>
          <Button onClick={handleFinishSession} disabled={isGeneratingSummary} className="flex items-center gap-2">
            {isGeneratingSummary ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Finish & Summarize
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
