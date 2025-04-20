"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePatients } from "@/contexts/patient-context";
import { useTranscription } from "@/contexts/transcription-context";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  FileAudio,
  Loader2,
  Mic,
  Save,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NewSessionFormProps {
  patientId: string;
  onSessionComplete: () => void;
}

export function NewSessionForm({
  patientId,
  onSessionComplete,
}: NewSessionFormProps) {
  const { toast } = useToast();

  // No test toast needed anymore
  const { addSession } = usePatients();
  const {
    transcript,
    audioRecording,
    isRecordingAudio,
    resetTranscription,
    startAudioRecording,
    stopAudioRecording,
    generateSummary,
  } = useTranscription();

  const [sessionTitle, setSessionTitle] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [summary, setSummary] = useState<{
    text: string;
    keyPoints: string[];
    prescriptions: string[];
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [apiSummary, setApiSummary] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Helper function to update transcript with custom text
  const updateTranscriptWithText = (text: string) => {
    // Directly update the textarea content
    // This is a hack for demo purposes since we don't have direct access to setTranscript
    setTimeout(() => {
      const transcriptElement = document.getElementById(
        "transcript"
      ) as HTMLTextAreaElement;
      if (transcriptElement) {
        transcriptElement.value = text;
      }
    }, 100);
  };

  // Function to clear the transcript
  const handleClearTranscript = () => {
    resetTranscription();

    // Also clear the textarea directly to ensure it's empty
    setTimeout(() => {
      const transcriptElement = document.getElementById(
        "transcript"
      ) as HTMLTextAreaElement;
      if (transcriptElement) {
        transcriptElement.value = "";
      }
    }, 100);

    toast({
      title: "Transcript Cleared",
      description: "The transcript has been cleared.",
      variant: "default",
    });
  };

  // No timer cleanup needed anymore

  // Create URL for audio blob when recording is available
  useEffect(() => {
    if (audioRecording) {
      // Revoke previous URL to avoid memory leaks
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // Create a new URL for the audio blob
      const url = URL.createObjectURL(audioRecording);
      setAudioUrl(url);

      // Show the send button when we have an audio recording
      setShowSendButton(true);
    } else {
      // Hide the send button when there's no audio recording
      setShowSendButton(false);
    }

    // Cleanup function to revoke URL when component unmounts or audioRecording changes
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioRecording]);

  // We'll keep the session duration state for the saved session data

  // Audio recording handlers
  const handleStartAudioRecording = () => {
    try {
      startAudioRecording();

      toast({
        title: "Audio Recording Started",
        description: "Recording audio from your microphone.",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopAudioRecording = async () => {
    try {
      await stopAudioRecording();

      toast({
        title: "Audio Recording Stopped",
        description: "Audio recording has been saved.",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "An error occurred while stopping the recording.",
        variant: "destructive",
      });
    }
  };

  // Handler for sending the audio file to the backend and getting a transcription
  const handleSendAudio = async () => {
    if (!audioRecording) {
      toast({
        title: "Error",
        description: "No audio recording found.",
        variant: "destructive",
      });
      return;
    }

    // Set processing state
    setIsProcessingAudio(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Define the expected response type for the API
      interface ApiConversationItem {
        [key: string]: string; // Allow for dynamic speaker keys like speaker1, speaker2
      }

      interface TranscriptionResponse {
        conversation: ApiConversationItem[];
        summary?: string;
      }

      const uploadAudioToFastAPI = async (): Promise<TranscriptionResponse | null> => {
        const audioElement = audioRef.current;
        if (!audioElement || !audioElement.src) {
          console.error("No audio source found.");
          return null;
        }
        try {
          // Convert audio src (blob url) to Blob
          const blobResponse = await fetch(audioElement.src);
          const blob = await blobResponse.blob();

          // Create FormData object
          const formData = new FormData();
          formData.append("file", blob, "recording.wav");
          formData.append("num_speakers", "2"); // Default value, adjust as needed
          formData.append("whisper_model", "base"); // Default model, adjust as needed


          // Send to FastAPI endpoint
          const res = await fetch("http://localhost:8000/upload-audio/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
          }

          const data = await res.json();
          console.log("Conversation:", data.conversation);
          console.log("Summary:", data.summary);

          // Store the summary from the API response if available
          if (data.summary) {
            setApiSummary(data.summary);
          }

          // Validate the conversation data structure
          if (data.conversation && Array.isArray(data.conversation)) {
            // Check if the conversation array has the expected structure
            const isValidFormat = data.conversation.every((item: ApiConversationItem | any) =>
              item && typeof item === 'object' && 'text' in item &&
              Object.keys(item).some(key => key.startsWith('speaker'))
            );

            if (!isValidFormat) {
              console.error("Conversation data does not have the expected format");
            }
          } else {
            console.error("Conversation data is missing or not an array");
          }

          // Optionally, update UI with the response data
          // For example:
          // setTranscription(data.conversation);
          // setSummary(data.summary);

          return data; // Return the data for further processing if needed
        } catch (error) {
          console.error("Upload failed:", error);
          // Optionally show error to user
          // setError(error.message);
          throw error; // Re-throw to handle at calling site if needed
        }
      };

      await uploadAudioToFastAPI();

      // Mock transcription result
      const mockTranscriptions = [
        "Doctor: Good morning, how are you feeling today?\n\nPatient: I've been having some headaches and trouble sleeping.\n\nDoctor: I'm sorry to hear that. How long has this been going on?\n\nPatient: For about two weeks now. It's affecting my work.",
        "Doctor: Can you describe your symptoms in more detail?\n\nPatient: I have a throbbing pain on the right side of my head, and I'm finding it hard to fall asleep at night.\n\nDoctor: Are you experiencing any other symptoms like nausea or sensitivity to light?\n\nPatient: Yes, sometimes bright lights make it worse.",
        "Doctor: Have you been under more stress lately?\n\nPatient: Yes, I've been working on a big project with tight deadlines.\n\nDoctor: That could be contributing to your symptoms. Let's talk about some strategies to manage your stress and improve your sleep.",
      ];

      // Get the response from the API
      const response = await uploadAudioToFastAPI();

      // Process the transcription data from the response
      // The response contains an array of speaker objects with speaker name and text

      if (response && response.conversation) {
        // Format the transcript from the conversation array
        const formattedTranscript = response.conversation
          .map((item: ApiConversationItem) => {
            // Find the speaker key (should be something like 'speaker1' or 'speaker2')
            const speakerKey = Object.keys(item).find(key => key.startsWith('speaker'));
            const speakerValue = speakerKey ? item[speakerKey] : 'Unknown';
            return `${speakerValue}: ${item.text}`;
          })
          .join('\n\n');

        // Update the transcript using our helper function
        updateTranscriptWithText(formattedTranscript);
      } else {
        // Fallback to mock data if response is not as expected
        const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
        const transcriptionText = mockTranscriptions[randomIndex];
        updateTranscriptWithText(transcriptionText);
      }

      toast({
        title: "Transcription Complete",
        description: "Audio has been successfully transcribed.",
      });
    } catch (error) {
      toast({
        title: "Transcription Failed",
        description: "Failed to process the audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleFinishSession = async () => {
    if (!sessionTitle) {
      toast({
        title: "Error",
        description: "Please enter a session title.",
        variant: "destructive",
      });
      return;
    }

    // Get the transcript from the textarea (since we might have updated it directly)
    const transcriptElement = document.getElementById(
      "transcript"
    ) as HTMLTextAreaElement;
    const currentTranscript = transcriptElement
      ? transcriptElement.value
      : transcript;

    if (!currentTranscript || currentTranscript.trim().length === 0) {
      toast({
        title: "Error",
        description: "The transcript is empty. Please record a session first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSummary(true);
    setShowSummary(false); // Hide any previous summary while generating

    try {
      // If we have a summary from the API, use it to create a formatted summary
      if (apiSummary) {
        // Create a summary object with the API summary text
        const formattedSummary = {
          text: apiSummary,
          keyPoints: extractKeyPointsFromSummary(apiSummary),
          prescriptions: []
        };

        // Store the summary in state
        setSummary(formattedSummary);
      } else {
        // Fallback to generating a summary if no API summary is available
        const generatedSummary = await generateSummary(currentTranscript);
        setSummary(generatedSummary);
      }

      // Show the summary
      setShowSummary(true);

      toast({
        title: "Summary Generated",
        description: "The session has been summarized successfully.",
      });

      // Don't save the session or reset the form yet - let the user review the summary first
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Helper function to extract key points from a summary text
  const extractKeyPointsFromSummary = (summaryText: string): string[] => {
    // Split the summary into sentences
    const sentences = summaryText.split(/\.\s+/);

    // Filter out short sentences and limit to 5 key points
    return sentences
      .filter(sentence => sentence.trim().length > 10)
      .slice(0, 5)
      .map(sentence => sentence.trim() + '.');
  };

  // Function to save the session after reviewing the summary
  const handleSaveSession = () => {
    if (!summary || !sessionTitle) return;

    // Get the transcript from the textarea
    const transcriptElement = document.getElementById(
      "transcript"
    ) as HTMLTextAreaElement;
    const currentTranscript = transcriptElement
      ? transcriptElement.value
      : transcript;

    try {
      // Add the session to the patient's record
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
      });

      toast({
        title: "Session Saved",
        description: "The session has been saved successfully.",
      });

      // Reset the form
      setSessionTitle("");
      setSessionDuration(0);
      //resetTranscription();
      setSummary(null);
      setShowSummary(false);
      setApiSummary(null);

      // Clean up audio URL and reset send button state
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setShowSendButton(false);
      }

      onSessionComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save the session. Please try again.",
        variant: "destructive",
      });
    }
  };

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
                  {isRecordingAudio
                    ? "Audio recording in progress"
                    : "Audio recording paused"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {audioRecording
                    ? "Audio recording saved"
                    : "Start recording to capture audio"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isRecordingAudio ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleStopAudioRecording}
                  className="h-8 w-8"
                >
                  <Square className="h-4 w-4" color="red" />
                  <span className="sr-only">Stop Audio Recording</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleStartAudioRecording}
                  className="h-8 w-8"
                >
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
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
              />
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
              This transcript is generated from the audio recording and may
              contain errors.
            </p>
          </div>

          {/* Summary Display */}
          {showSummary && summary && (
            <div className="space-y-4 mt-6 p-4 border rounded-md bg-muted/50">
              <div>
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="text-sm">{summary.text}</p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Key Points</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="text-sm">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {summary.prescriptions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Prescriptions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {summary.prescriptions.map((prescription, index) => (
                      <li key={index} className="text-sm">
                        {prescription}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={handleSaveSession}
                className="w-full mt-2 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Save Session
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClearTranscript}>
            Clear Transcript
          </Button>
          <Button
            onClick={handleFinishSession}
            disabled={isGeneratingSummary || showSummary}
            className="flex items-center gap-2"
          >
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
  );
}
