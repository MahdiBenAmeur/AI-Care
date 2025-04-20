#!/usr/bin/env python3
import uuid
from datetime import datetime
from pymongo import MongoClient
from typing import List, Dict, Optional, Any
from ollama import chat

# ───────────────────────────────────────────────────────────────────────────────
# MongoDB setup: connect to local 'it_impact' DB and 'patients' collection
client = MongoClient("mongodb://localhost:27017/")
db = client["it_impact"]
patients_col = db["patients"]

# ───────────────────────────────────────────────────────────────────────────────
# Ollama chat model configuration
MODEL_NAME = "qwen2.5:3b"

# ───────────────────────────────────────────────────────────────────────────────
# System prompts
SYSTEM_SUMMARIZER = {
    "role": "system",
    "content": ("You are a medical conversation summarizer. "
                "Given a list of messages with speakers and text, produce "
                "a concise paragraph capturing the patient’s condition, key "
                "complaints, and any treatment or advice given.")
}

SYSTEM_CHATBOT_TEMPLATE = {
    "role": "system",
    "content": ("""
You are a helpful, empathetic medical assistant.

RULES:
1-Never mention EHR, records, or external systems.
3 Use **only** the patient summary below to answer questions.
4. Never mention EHR, charts, records, or ask for more data.
5. If a question cannot be answered from the summary, reply exactly:
   “I only have the patient information provided; I can’t answer outside of that.”

Patient summary:
{patient_info}
"""
)
}


# ───────────────────────────────────────────────────────────────────────────────
# CRUD and conversation functions

def add_patient(
        first_name: str,
        last_name: str,
        dob: str,
        gender: Optional[str] = None,
        contact: Optional[str] = None
) -> str:
    """
    Insert a new patient document with empty conversations and chat_history.
    Returns the generated patient_id.
    """
    patient_id = str(uuid.uuid4())
    patient_doc = {
        "id": patient_id,
        "first_name": first_name,
        "last_name": last_name,
        "dob": dob,
        "gender": gender,
        "contact": contact,
        "conversations": [],
        "chat_history": []
    }
    patients_col.insert_one(patient_doc)
    return patient_id


def get_chat_history(patient_id: str) -> List[Dict[str, Any]]:
    """Return the chat_history array for the given patient."""
    patient = patients_col.find_one({"id": patient_id}, {"chat_history": 1})
    if not patient:
        raise ValueError(f"Patient with id {patient_id} not found")
    return []


def add_chat_message(
        patient_id: str,
        role: str,
        text: str
) -> bool:
    """
    Append a message to the patient's chat_history.
    role: 'doctor', 'assistant', etc.
    """
    entry = {
        "role": role,
        "text": text,
        "timestamp": datetime.utcnow()
    }
    result = patients_col.update_one(
        {"id": patient_id},
        {"$push": {"chat_history": entry}}
    )
    return result.modified_count == 1


def add_conversation(
        patient_id: str,
        messages: List[Dict[str, object]]
) -> str:
    """
    Create a new conversation record (without summary) and return its id.
    """
    conv_id = str(uuid.uuid4())
    conv = {
        "id": conv_id,
        "start": datetime.utcnow(),
        "messages": messages,
        "summary": ""
    }
    patients_col.update_one(
        {"id": patient_id},
        {"$push": {"conversations": conv}}
    )
    return conv_id


def get_patient_summaries(
        patient_id: str,
        max_summaries: int = 2
) -> List[str]:
    """
    Return up to max_summaries summary texts for the patient, sorted newest first.
    """
    patient = patients_col.find_one({"id": patient_id}, {"conversations": 1})
    if not patient:
        raise ValueError(f"Patient with id {patient_id} not found")

    convs = patient.get("conversations", [])
    # sort by start descending
    sorted_convs = convs[-max_summaries:]
    print(sorted_convs)
    return [f"summery for session {str(c.get('start'))[:10]} : {c.get('summary', '')}" for c in sorted_convs]


def summarize_last_conversation(
        patient_id: str,
        model_name: str = MODEL_NAME
) -> str:
    """
    Fetch the last conversation messages, summarize via Ollama, store summary, return it.
    """
    # 1) retrieve conversations
    patient = patients_col.find_one({"id": patient_id}, {"conversations": 1})
    if not patient:
        raise ValueError(f"Patient with id {patient_id} not found")
    convs = patient.get("conversations", [])
    if not convs:
        raise ValueError("No conversations to summarize")

    # 2) find the latest by start
    last_conv = convs[-1]
    # 3) build messages_text
    msgs = last_conv.get("messages", [])
    lines = [f"{m.get('speaker')}: {m.get('text')}" for m in msgs]
    messages_text = "\n".join(lines)

    # 4) call summarizer
    summary_msgs = [SYSTEM_SUMMARIZER, {"role": "user", "content": messages_text}]
    summary = chat(model=model_name, messages=summary_msgs)
    summary = summary["message"]["content"]

    # 5) update the last_conv summary in DB
    conv_id = last_conv.get("id")
    patients_col.update_one(
        {"id": patient_id, "conversations.id": conv_id},
        {"$set": {"conversations.$.summary": summary}}
    )

    return summary


def chat_with_doctor(
        patient_id: str,
        doctor_message: str,
        model_name: str = MODEL_NAME
) -> str:
    """
    Contextual chat: fetch summaries, chat history, add new conv if needed,
    send doctor message, get assistant reply, save both.
    """
    # ensure last conversation exists
    patient = patients_col.find_one({"id": patient_id}, {"conversations": 1})
    if not patient:
        raise ValueError(f"Patient with id {patient_id} not found")
    if not patient.get("conversations"):
        # create a brand new conversation record
        conv_id = add_conversation(patient_id, [])

    # 1) get context
    summaries = "\n".join(get_patient_summaries(patient_id, max_summaries=2)) or ""
    print(summaries)
    history_entries = get_chat_history(patient_id)

    # 2) build system + history
    system_msg = {"role": "system", "content": SYSTEM_CHATBOT_TEMPLATE["content"].format(patient_info=summaries)}
    messages: List[Dict[str, str]] = [system_msg]
    role_map = {"doctor": "user", "assistant": "assistant", "patient": "user"}
    for entry in history_entries:
        role = role_map.get(entry.get("role", "assistant"), "user")
        messages.append({"role": role, "content": entry.get("text", "")})

    # 3) append new doctor message
    messages.append({"role": "user", "content": doctor_message + " ps : do not mention EHR or any other external tools "})
    # 4) call chat
    response = chat(model=model_name, messages=messages)["message"]["content"]

    # 5) save chat entries
    add_chat_message(patient_id, role="doctor", text=doctor_message)
    add_chat_message(patient_id, role="assistant", text=response)

    return response

if __name__ == "__main__":
    """#print(get_patient_summaries("dfb5608c-3883-4a2c-821f-83dbc8608c43"))
    from datetime import datetime
    from uuid import uuid4

    # Dummy messages
    dummy_messages = [
        {"speaker": "patient", "text": "I've been having a really bad stomach ache since yesterday."},
        {"speaker": "doctor", "text": "Can you describe the pain? Is it sharp, dull, or cramping?"},
        {"speaker": "patient", "text": "It's more like a cramping pain, and I feel nauseous too."},
        {"speaker": "doctor", "text": "Did you eat anything unusual recently or experience diarrhea or fever?"},
        {"speaker": "patient", "text": "I ate some street food two days ago. No fever but had diarrhea this morning."},
        {"speaker": "doctor",
         "text": "Sounds like a mild foodborne illness. Stay hydrated and follow a light diet. I’ll prescribe some medication for nausea and cramps."}
    ]

    # Add the conversation
    conv_id = add_conversation("dfb5608c-3883-4a2c-821f-83dbc8608c43", dummy_messages)"""
    print("Starting su")
    # Summarize it
    summary = summarize_last_conversation("dfb5608c-3883-4a2c-821f-83dbc8608c43")

    print("📝 Summary:\n", summary)
