import { useState, useRef, useEffect } from "react";
import { speak, stopSpeaking } from "../../hooks/useSpeech";
import { Bot, User, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SIMULATED_CONVERSATION } from "../../lib/simulatorData";

export default function ConversationPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const playSimulation = async () => {
    setIsPlaying(true);
    playingRef.current = true;
    setMessages([]);
    
    for (let i = 0; i < SIMULATED_CONVERSATION.length; i++) {
      if (!playingRef.current) break;
      
      const msg = SIMULATED_CONVERSATION[i];

      setMessages(prev => [...prev, {
        ...msg,
        id: i,
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }]);

      if (msg.speaker === "robot") {
        await speak(msg.text);
      } else {
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 800));
      }
    }
    setIsPlaying(false);
    playingRef.current = false;
  };

  const stopSimulation = () => {
    playingRef.current = false;
    setIsPlaying(false);
    stopSpeaking();
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      speaker: "patient",
      text: input,
      id: Date.now(),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    }]);
    setInput("");
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Dialogue Robot — Patient</h3>
        </div>
        <Button 
          size="sm" 
          variant={isPlaying ? "destructive" : "default"}
          onClick={isPlaying ? stopSimulation : playSimulation}
          className="h-8 text-xs"
        >
          {isPlaying ? "Arrêter" : "▶ Simuler session"}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Cliquez sur "Simuler session" pour démarrer</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Le robot posera des questions médicales au patient</p>
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
        {isPlaying && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-muted-foreground">MERA parle...</span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Input 
          placeholder="Répondre au robot..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="h-10"
        />
        <Button size="icon" onClick={sendMessage} className="h-10 w-10 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}