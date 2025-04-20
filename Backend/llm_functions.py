#!/usr/bin/env python3
from typing import List, Dict
from ollama import chat
from dbManagement import (
    get_chat_history,
    add_chat_message,
    get_patient_summaries
)

# choose your model
MODEL_NAME = "qwen2.5:14b"

# ─── 1) Summarizer ──────────────────────────────────────────────────────────────

SYSTEM_SUMMARIZER = {
    "role": "system",
    "content": """\
You are a medical conversation summarizer.
Given a list of messages with speakers and text, produce a single concise paragraph
that captures the patient’s condition, key complaints, and any treatment or advice given."""
}

def summarize_conversation(
    messages_text: str,
    model_name: str = MODEL_NAME
) -> str:
    """
    Summarize via Ollama chat.
    `messages_text` should be newline-separated "SPEAKER: text" lines.
    """
    messages = [
        SYSTEM_SUMMARIZER,
        {"role": "user", "content": messages_text}
    ]
    response = chat(model=model_name, messages=messages)
    return response.strip()


# ─── 2) Chatbot (Doctor ↔ Assistant) ─────────────────────────────────────────────

SYSTEM_CHATBOT_TEMPLATE = """\
You are a helpful, empathetic medical assistant.
You have the following information about a specific patient:
{patient_info}

Answer the doctor's questions about the patient using the provided context.
Always respond in a professional, supportive tone."""


def chat_with_doctor(
    patient_id: str,
    doctor_message: str,
    model_name: str = MODEL_NAME
) -> str:
    """
    Contextual chat with Ollama about a specific patient.
    Fetches patient summaries and chat history, appends the doctor's message,
    generates an assistant reply, and saves both messages for future context.
    """
    # 1) Fetch patient context
    summaries = get_patient_summaries(patient_id)
    history_entries = get_chat_history(patient_id)

    # 2) Build system prompt with summaries
    system_content = SYSTEM_CHATBOT_TEMPLATE.format(patient_info=summaries)
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_content}]

    # 3) Append prior chat history
    """role_map = {"doctor": "user", "assistant": "assistant", "patient": "user"}
    for entry in history_entries:
        role = role_map.get(entry.get("role", "assistant"), "user")
        messages.append({"role": role, "content": entry.get("text", "")})"""

    # 4) Append new doctor message
    messages.append({"role": "user", "content": doctor_message})
    print(messages)
    # 5) Call Ollama chat
    response = chat(model=model_name, messages=messages).strip()

    # 6) Save messages to history
    add_chat_message(patient_id, role="doctor", text=doctor_message)
    add_chat_message(patient_id, role="assistant", text=response)

    return response

if __name__ == "__main__":
    summarize_conversation()

