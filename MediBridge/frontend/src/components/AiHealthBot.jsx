import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { chatWithMediBot } from "../api/groqService";
import { useSpeech } from "../hooks/useSpeech";
import { useVoiceInput } from "../hooks/useVoiceInput";
import "./AiHealthBot.css";

const QUICK_PROMPTS = [
  "What is the generic salt for Dolo 650?",
  "I have a fever, cough & body ache. What specialist should I see?",
  "How do Google Meet doctor appointments work?",
  "मुझे सिरदर्द और चक्कर आ रहे हैं, क्या करूँ?",
  "Explain Paracetamol dosage guidelines",
];

export const AiHealthBot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello ${user?.name || "there"}! 👋 I'm **MediBot**, your AI Health Assistant powered by Groq. How can I help you today? Ask about symptoms, generic salts, doctor specialties, or appointment steps. (हिंदी में भी पूछ सकते हैं)`,
    },
  ]);

  const bodyRef = useRef(null);
  const { toggle, speaking, stop } = useSpeech();

  const handleVoiceTranscript = (text) => {
    setInput(text);
  };

  const { listening, toggleListening, isSupported: isMicSupported } = useVoiceInput({
    onTranscript: handleVoiceTranscript,
    lang: "en-IN",
  });

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput("");
    const newMessages = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setLoading(true);
    stop();

    try {
      const response = await chatWithMediBot(
        query,
        messages.slice(-6),
        user?.role || "patient",
        user?.name || "User"
      );
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an issue connecting to the Groq AI service. Please check your network connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          className="medibot-fab"
          onClick={() => setIsOpen(true)}
          title="Open AI Medical Assistant"
          aria-label="Open AI Medical Assistant"
        >
          <Sparkles size={24} />
          <span className="medibot-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="medibot-window">
          {/* Header */}
          <div className="medibot-header">
            <div className="medibot-header-info">
              <div className="medibot-avatar">🩺</div>
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>MediBot AI Assistant</strong>
                <small style={{ opacity: 0.85, fontSize: "0.75rem" }}>Powered by Groq Intelligence</small>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                stop();
              }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "4px" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="medibot-body" ref={bodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`medibot-msg ${m.role}`}>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                {m.role === "assistant" && (
                  <div style={{ marginTop: "6px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => toggle(m.content.replace(/[*#_`]/g, ""), "en")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "2px 4px",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Read aloud"
                    >
                      {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{speaking ? "Stop" : "Listen"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="medibot-msg assistant" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>MediBot is thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="medibot-chips">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                className="medibot-chip"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="medibot-footer">
            {isMicSupported && (
              <button
                className={`medibot-mic-btn ${listening ? "active" : ""}`}
                onClick={toggleListening}
                title={listening ? "Stop recording" : "Speak your question"}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <input
              type="text"
              className="medibot-input"
              placeholder={listening ? "Listening... speak now" : "Ask health query or symptom..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="medibot-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
