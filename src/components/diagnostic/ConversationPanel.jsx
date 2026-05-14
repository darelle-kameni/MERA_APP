import { useState, useRef, useEffect } from "react";
import { speak, stopSpeaking, startRecording, stopRecordingAndTranscribe, cancelRecording, isSpeechSupported } from "../../hooks/useSpeech";
import { base44 } from "@/api/base44Client";
import { Bot, User, Mic, MicOff, Send, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ConversationPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const startedRef = useRef(false);
  const micSupported = isSpeechSupported();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startSession = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    setThinking(true);

    try {
      const reply = await base44.integrations.Core.InvokeLLM({
        prompt: "Tu es MERA, un robot médical pédiatrique au Cameroun. Tu commences une consultation. Pose une question d'ouverture simple et amicale au patient (max 2 phrases).",
        max_tokens: 256,
      });
      const botMsg = {
        speaker: "robot",
        text: reply,
        id: Date.now(),
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([botMsg]);
      speak(reply);
    } catch {
      toast.error("Erreur au démarrage de la session");
    }
    setThinking(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    const text = input.trim();
    const userMsg = {
      speaker: "patient",
      text,
      id: Date.now(),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const history = [...messages, userMsg]
      .map(m => `${m.speaker === "patient" ? "Patient" : "MERA"}: ${m.text}`)
      .join("\n");
    try {
      const reply = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es MERA, un robot médical pédiatrique au Cameroun. Continue la consultation en posant des questions médicales adaptées. Reste concis (max 2 phrases).\n\n${history}\n\nMERA :`,
        max_tokens: 256,
      });
      const botMsg = {
        speaker: "robot",
        text: reply,
        id: Date.now() + 1,
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, botMsg]);
      speak(reply);
    } catch (err) {
      toast.error(err.status === 503 ? "Service IA indisponible" : "Erreur LLM");
    } finally {
      setThinking(false);
    }
  };

  const toggleMic = async () => {
    if (listening) {
      setListening(false);
      const transcript = await stopRecordingAndTranscribe({ language: 'fr' });
      if (transcript) setInput(prev => prev ? prev + ' ' + transcript : transcript);
      return;
    }
    try {
      await startRecording();
      setListening(true);
    } catch (err) {
      if (err.message === 'MIC_NOT_SUPPORTED') toast.error('Microphone non supporté');
      else if (err.name === 'NotAllowedError') toast.error("Autorisation microphone refusée");
      else toast.error("Impossible d'accéder au microphone");
    }
  };

  useEffect(() => () => cancelRecording(), []);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Dialogue Robot — Patient</h3>
        </div>
        {!started && (
          <Button
            size="sm"
            onClick={startSession}
            disabled={thinking}
            className="h-8 text-xs"
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Démarrer
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !started && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Cliquez sur "Démarrer" pour débuter la consultation</p>
            <p className="text-xs text-muted-foreground/70 mt-1">MERA dialoguera avec le patient</p>
          </div>
        )}
        {thinking && messages.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Démarrage de la session...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2.5", msg.speaker === "patient" ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
              msg.speaker === "robot" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {msg.speaker === "robot" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
              "max-w-[75%] rounded-2xl px-3.5 py-2.5",
              msg.speaker === "robot"
                ? "bg-primary/5 border border-primary/10 rounded-tl-sm"
                : "bg-muted rounded-tr-sm"
            )}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
        {thinking && messages.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-muted-foreground">MERA réfléchit...</span>
          </div>
        )}
      </div>

      {started && (
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            placeholder="Répondre au robot..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={thinking}
            className="h-10"
          />
          {micSupported && (
            <Button size="icon" onClick={toggleMic} disabled={thinking}
              variant={listening ? "destructive" : "outline"}
              className="h-10 w-10 flex-shrink-0 relative"
              title={listening ? "Cliquer pour arrêter et transcrire" : "Enregistrer la voix"}>
              {listening ? (
                <>
                  <MicOff className="w-4 h-4 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
                </>
              ) : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || thinking}
            className="h-10 w-10 flex-shrink-0">
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
