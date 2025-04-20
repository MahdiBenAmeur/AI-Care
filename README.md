# AI-Care: Medical Conversation Assistant

AI-Care is an AI-powered tool that passively transcribes doctor-patient conversations, summarizes key medical data, and builds a RAG (Retrieval-Augmented Generation) history for each patient. This application helps healthcare professionals manage patient information more efficiently by automating the documentation process.

![AI-Care](https://play-lh.googleusercontent.com/CAy-y3Ek676KH6hq_7-Z1G5wllW-7Z2g-pDAyJMB8vOGclHX2d2xE3COfzk5MBDS_XU)

## Features

- **Real-time Transcription**: Record and transcribe doctor-patient conversations
- **Automated Summarization**: Generate concise summaries of medical conversations
- **Patient Management**: Organize and track patient records
- **AI-Powered Chat**: Ask questions about patient history and get AI-generated responses
- **Voice Commands**: Control the application using voice commands
- **Secure Data Storage**: All patient data is stored securely in MongoDB

## Project Structure

The project consists of two main components:

1. **Frontend**: A Next.js application with React
2. **Backend**: A FastAPI server with MongoDB integration

### Technology Stack

#### Frontend
- Next.js 15.2.4
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Framer Motion for animations

#### Backend
- FastAPI
- MongoDB
- Ollama for LLM integration
- Whisper for speech-to-text transcription
- pydub for audio processing

## Installation

### Prerequisites

- Node.js (v18.18.0 or higher)
- Python 3.8+
- MongoDB
- Ollama (for local LLM)

### Backend Setup

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install the required Python packages:
   ```bash
   pip install fastapi uvicorn pymongo pydub ollama
   ```

3. Install additional dependencies for audio processing and transcription:
   ```bash
   pip install whisper pyaudio
   ```

4. Make sure MongoDB is running locally:
   ```bash
   # Start MongoDB (command may vary depending on your installation)
   mongod --dbpath /path/to/data/db
   ```

5. Start the FastAPI server:
   ```bash
   python fast.py
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   # or
   pnpm install --legacy-peer-deps
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or (for better performance navigating between routes)
   npm build
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage Guide

### Patient Management

1. **View Patients**: Navigate to the "Patients" section to see a list of all patients.
2. **Add a New Patient**: Click the "Add Patient" button and fill in the required information.
3. **View Patient Details**: Click on a patient card to view their detailed information, including medical history and conversation summaries.

### Recording Conversations

1. Navigate to a patient's profile.
2. Click on "New Session" to start a new conversation.
3. Use the recording controls to:
   - Start recording: Click the microphone button
   - Stop recording: Click the stop button
   - Process the recording: Click the "Process Audio" button

### Viewing Transcriptions and Summaries

After processing a recording:
1. The transcription will appear in the text area.
2. A summary will be generated automatically.
3. You can edit the transcription if needed.
4. Click "Save Session" to store the conversation and summary.

### Using the AI Assistant

1. Navigate to the chat interface within a patient's profile.
2. Type your question about the patient in the input field.
3. The AI will respond with relevant information based on the patient's history.

### Voice Commands

The application supports voice commands for hands-free operation:
- "Start recording" - Begins a new recording session
- "Stop recording" - Ends the current recording session
- "Process audio" - Transcribes the recorded audio
- "Save session" - Saves the current session

## API Endpoints

The backend provides the following API endpoints:

- `POST /upload-audio/`: Upload and process an audio file
- `POST /chat/`: Send a message to the AI assistant
- `GET /patient-summary/`: Get summaries of patient conversations

## Development

### Frontend

The frontend is built with Next.js and uses the following folder structure:

- `app/`: Next.js app router pages
- `components/`: Reusable UI components
- `contexts/`: React context providers
- `lib/`: Utility functions
- `public/`: Static assets

### Backend

The backend is built with FastAPI and uses the following files:

- `fast.py`: Main FastAPI application
- `dbManagement.py`: MongoDB database operations
- `llm_functions.py`: LLM integration for summarization and chat

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [MongoDB](https://www.mongodb.com/)
- [Ollama](https://ollama.ai/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
