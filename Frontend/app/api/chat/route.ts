import { NextResponse } from 'next/server';

type Patient = {
  id: string;
  name: string;
  sex: string;
  dateOfBirth: string;
  lastVisit?: string;
};

type Session = {
  id: string;
  title: string;
  date: string;
  duration: number;
  transcript: string;
  summary: string;
  keyPoints: string[];
  prescriptions?: string[];
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { message, patientId, patientData, sessionData } = body;

    if (!message) {
      return NextResponse.json(
        {
          detail: [
            {
              loc: ["body", "message"],
              msg: "Field required",
              type: "value_error.missing"
            }
          ]
        },
        { status: 400 }
      );
    }

    // Process the message and generate a response
    let response = '';

    // If patient data is provided, use it to generate a more contextual response
    if (patientData && sessionData) {
      response = generateResponse(message, patientData, sessionData);
    } else {
      // Simple response if no patient data is provided
      response = `I received your message: "${message}". To provide more specific information, I would need patient data.`;
    }

    // Return the response in the expected format
    return NextResponse.json(
      {
        detail: [
          {
            loc: ["response", 0],
            msg: response,
            type: "success"
          }
        ]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      {
        detail: [
          {
            loc: ["server", 0],
            msg: "Internal server error",
            type: "server_error"
          }
        ]
      },
      { status: 500 }
    );
  }
}

// Helper function to generate responses based on patient data
function generateResponse(question: string, patient: Patient, sessions: Session[]): string {
  const questionLower = question.toLowerCase();

  // Basic patient information
  if (questionLower.includes("name") || questionLower.includes("who is")) {
    return `The patient's name is ${patient.name}.`;
  }

  if (questionLower.includes("age") || questionLower.includes("how old")) {
    const birthDate = new Date(patient.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return `The patient is ${age} years old (born on ${birthDate.toLocaleDateString()}).`;
  }

  if (questionLower.includes("gender") || questionLower.includes("sex")) {
    return `The patient's sex is recorded as ${patient.sex}.`;
  }

  // Medical history and sessions
  if (questionLower.includes("last visit") || questionLower.includes("last appointment")) {
    if (patient.lastVisit) {
      return `The patient's last visit was on ${new Date(patient.lastVisit).toLocaleDateString()}.`;
    } else {
      return "I don't have a record of the patient's last visit date.";
    }
  }

  if (questionLower.includes("session") || questionLower.includes("appointment") || questionLower.includes("visit")) {
    if (sessions.length === 0) {
      return "There are no recorded sessions for this patient yet.";
    }

    const sessionCount = sessions.length;
    const latestSession = sessions[0];
    return `The patient has had ${sessionCount} recorded session(s). The most recent was "${latestSession.title}" on ${new Date(latestSession.date).toLocaleDateString()}.`;
  }

  // Symptoms and conditions
  if (questionLower.includes("headache") || questionLower.includes("pain")) {
    const headacheSession = sessions.find(
      (s) => s.transcript.toLowerCase().includes("headache") || s.summary.toLowerCase().includes("headache")
    );

    if (headacheSession) {
      return `The patient reported headaches during the session on ${new Date(headacheSession.date).toLocaleDateString()}. According to the notes, they were experiencing headaches which may be related to stress or other factors mentioned in their medical history.`;
    } else {
      return "I don't see any records of the patient reporting headaches in the available session data.";
    }
  }

  if (
    questionLower.includes("medication") ||
    questionLower.includes("prescription") ||
    questionLower.includes("drug")
  ) {
    const medicationInfo = sessions.flatMap((s) => s.prescriptions || []).filter(Boolean);

    if (medicationInfo.length > 0) {
      return `The patient has been prescribed the following medications:\n\n${medicationInfo.join("\n")}`;
    } else {
      return "I don't see any medication prescriptions in the available records.";
    }
  }

  if (questionLower.includes("summary") || questionLower.includes("overview")) {
    if (sessions.length === 0) {
      return `${patient.name} is a ${patient.sex.toLowerCase()} patient. There are no recorded sessions or medical history available yet.`;
    }

    const latestSession = sessions[0];
    return `${patient.name} is a ${patient.sex.toLowerCase()} patient. Their most recent visit was for "${latestSession.title}" on ${new Date(latestSession.date).toLocaleDateString()}. ${latestSession.summary}`;
  }

  // Default response for unknown questions
  return `I don't have specific information about that in ${patient.name}'s records. You might want to check their full medical history or ask them directly during your next session.`;
}
