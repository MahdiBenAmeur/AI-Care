#!/usr/bin/env python3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid

# Import from your existing files
from transcribe import audio_to_convo  # Your transcription module
# Import functions from your patient management module
from dbManagement import (
    add_conversation,
    summarize_last_conversation,
    get_patient_summaries,
    chat_with_doctor
)

# Constants
TEST_PATIENT_ID = "dfb5608c-3883-4a2c-821f-83dbc8608c43"
UPLOAD_DIR = "uploads"



# Create FastAPI app
app = FastAPI(title="Medical Assistant API")

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.post("/upload-audio/")
async def upload_audio(
        file: UploadFile = File(...),
        num_speakers: Optional[int] = 2,
        whisper_model: str = "base"
):
    """
    Endpoint to receive an audio file, transcribe it, save it for the test patient,
    summarize it, and return the conversation.
    """
    # File paths for processing
    raw_file_path = "raw_audio.wav"
    mp3_file_path = "temp_audio.mp3"
    converted_file_path = "audio.wav"

    try:
        # Read the file content
        file_content = await file.read()

        # Write content to file
        with open(raw_file_path, "wb") as buffer:
            buffer.write(file_content)

        # Convert to MP3 then back to WAV using pydub
        from pydub import AudioSegment

        try:
            # First attempt to load the file (format will be auto-detected)
            sound = AudioSegment.from_file(raw_file_path)

            # Export as MP3
            sound.export(mp3_file_path, format="mp3")
            print(f"Converted to MP3: {mp3_file_path}")

            # Load the MP3 and export as WAV
            mp3_sound = AudioSegment.from_mp3(mp3_file_path)
            mp3_sound.export(converted_file_path, format="wav")
            print(f"Converted back to WAV: {converted_file_path}")

        except Exception as conv_error:
            print(f"Conversion error: {conv_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {str(conv_error)}")

        # Verify file exists and has content
        import os
        if not os.path.exists(converted_file_path) or os.path.getsize(converted_file_path) == 0:
            raise HTTPException(status_code=400, detail="Failed to create valid WAV file")

        print(f"Processing file: {converted_file_path}, Size: {os.path.getsize(converted_file_path)} bytes")

        # Transcribe audio to conversation
        conversation = audio_to_convo(
            audio_path=converted_file_path,
            num_speakers=num_speakers,
            whisper_model=whisper_model
        )

        # Add conversation to patient record
        add_conversation(TEST_PATIENT_ID, conversation)

        # Generate and save summary
        summary = summarize_last_conversation(TEST_PATIENT_ID)

        # Return the conversation and summary
        return JSONResponse(content={
            "status": "success",
            "conversation": conversation,
            "summary": summary
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")





@app.post("/chat/")
async def chat(message: str = Form(...)):
    """
    Endpoint to send messages to the chatbot and return its response.
    Always uses the test patient ID.
    """
    print(message)
    try:
        response = chat_with_doctor(TEST_PATIENT_ID, message)
        print(response)
        return JSONResponse(content={
            "status": "success",
            "response": response
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.get("/patient-summary/")
async def get_summary():
    """
    Get summaries of conversations for the test patient.
    """
    try:
        summaries = get_patient_summaries(TEST_PATIENT_ID)
        return JSONResponse(content={
            "status": "success",
            "summaries": summaries
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summaries: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)