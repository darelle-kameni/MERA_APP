import { useState, useRef, useEffect } from "react";
import { speak } from "../hooks/useSpeech";
import { base44 } from "@/api/base44Client";
import { Bot, Send, Loader2, Globe, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HISTORY_KEY = "mera_ai_simulator_sessions_v1";

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
};

const saveHistory = (sessions) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, 20))); } catch { /* ignore */ }
};

export default function AISimulator() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [mode, setMode] = useState("adult");
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Persist current session whenever it changes
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    const sessions = loadHistory().filter((s) => s.id !== sessionId);
    sessions.unshift({ id: sessionId, language, mode, messages, updatedAt: Date.now() });
    saveHistory(sessions);
    setHistory(sessions);
  }, [messages, sessionId, language, mode]);

  const startSession = () => {
    const langGreeting = {
      fr: "Bonjour ! Je suis MERA, votre assistant médical robotisé. Je suis là pour vous aider à évaluer votre état de santé. Comment vous sentez-vous aujourd'hui ?",
      en: "Hello! I am MERA, your robotic medical assistant. I'm here to help assess your health. How are you feeling today?",
      ff: "Sannu! Mi woni MERA, ballo maa cellal. Mi wari wallude ma. Noy mbuurdi-ɗaa hannde?",
      ew: "Mbolo! Me ne MERA, nnom ngul evus bi si. Me ke dzing os a nyiñ. Wo waa ndigi ane?",
    };
    const greeting = langGreeting[language];
    setSessionId(`sim_${Date.now()}`);
    setMessages([{
      id: 0,
      role: "assistant",
      content: greeting,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    }]);
    speak(greeting);
  };

  const loadSession = (s) => {
    setSessionId(s.id);
    setLanguage(s.language);
    setMode(s.mode);
    setMessages(s.messages);
    setShowHistory(false);
  };

  const deleteSession = (id) => {
    const next = loadHistory().filter((s) => s.id !== id);
    saveHistory(next);
    setHistory(next);
    if (sessionId === id) { setSessionId(null); setMessages([]); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    const langInstruction = {
      fr: "Réponds en français.",
      en: "Reply in English.",
      ff: "Reply in Fulfulde.",
      ew: "Reply in Ewondo.",
    };

    const conversationHistory = messages.map((m) => `${m.role === "user" ? "Patient" : "MERA"}: ${m.content}`).join("\n");

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es MERA, un robot médical intelligent au Cameroun. Tu poses des questions médicales pour évaluer l'état du patient.
${mode === "child" ? "Le patient est un enfant, utilise un ton doux et ludique." : "Le patient est un adulte, utilise un ton professionnel."}
${langInstruction[language]}

Historique de la conversation:
${conversationHistory}

Patient: ${currentInput}

Réponds en tant que MERA. Pose une question médicale de suivi ou donne un diagnostic préliminaire si suffisamment d'informations. Sois concis (max 3 phrases).`,
      });

      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }]);
      speak(response);
    } catch (err) {
      const msg = err.status === 503
        ? "Le service IA n'est pas configuré côté serveur (clé API manquante)."
        : "Erreur lors de l'appel au modèle IA. Réessayez.";
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(currentInput);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <Bot className="w-6 h-6 text-primary" />
            Simulateur IA conversationnelle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulez un dialogue MERA sans robot physique
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)} className="gap-1.5">
            <History className="w-3.5 h-3.5" /> {history.length}
          </Button>
        )}
      </div>

      {showHistory && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-1.5 max-h-64 overflow-y-auto">
          {history.map((s) => (
            <div key={s.id} className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2.5 py-2 group">
              <button onClick={() => loadSession(s)} className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {s.messages.find((m) => m.role === "user")?.content || "Session vide"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(s.updatedAt).toLocaleString("fr-FR")} · {s.messages.length} messages
                </p>
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => deleteSession(s.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36"><Globe className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ff">Fulfulde</SelectItem>
            <SelectItem value="ew">Ewondo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="adult">Mode adulte</SelectItem>
            <SelectItem value="child">Mode enfant</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={startSession} size="sm" className="h-9">Nouvelle session</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Bot className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">Cliquez "Nouvelle session" pour commencer</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}>
                {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">P</span>}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                msg.role === "assistant" ? "bg-primary/5 border border-primary/10 rounded-tl-sm" : "bg-muted rounded-tr-sm",
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 px-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">MERA analyse...</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input
            placeholder="Décrivez vos symptômes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={messages.length === 0 || loading}
            className="h-10"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || loading} className="h-10 w-10 flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
