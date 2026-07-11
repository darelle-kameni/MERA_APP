import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePatientAuth } from '@/lib/PatientAuthContext';
import { speak, listen, isSpeechSupported } from '@/hooks/useSpeech';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, Volume2, VolumeX, AlertCircle, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PatientChat() {
  const { t } = useTranslation();
  const { patient } = usePatientAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const speechSupported = isSpeechSupported();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const greeting = `Bonjour${patient?.full_name ? ' ' + patient.full_name.split(' ')[0] : ''} ! Je suis MERA. Comment puis-je vous aider aujourd'hui ? Décrivez-moi vos symptômes ou posez-moi une question.`;
    setMessages([{
      id: 0, role: 'assistant', content: greeting,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }]);
    if (voiceOn) speak(greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const userMsg = {
      id: Date.now(), role: 'user', content: text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map((m) => `${m.role === 'user' ? 'Patient' : 'MERA'}: ${m.content}`).join('\n');

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Conversation:
${history}

Patient: ${text}

Réponds en tant que MERA, en français, de façon concise (max 3 phrases).`,
      });
      const botMsg = {
        id: Date.now() + 1, role: 'assistant', content: response,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      if (voiceOn) speak(response);
    } catch (err) {
      const msg = err.status === 503
        ? "Le service de discussion n'est pas configuré pour le moment."
        : "Une erreur s'est produite. Réessayez.";
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const startListening = async () => {
    setListening(true);
    try {
      const transcript = await listen();
      if (transcript) {
        setInput((prev) => prev ? prev + " " + transcript : transcript);
      }
    } catch (err) {
      if (err.message !== "SPEECH_NOT_SUPPORTED" && err.message !== "aborted") {
        toast.error("Impossible d'accéder au microphone");
      }
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Assistant MERA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("patient.chatPrompt", "Posez vos questions de santé en toute confiance")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setVoiceOn((v) => !v)}
          aria-label={voiceOn ? t("patient.disableVoice", "Désactiver la voix") : t("patient.enableVoice", "Activer la voix")}>
          {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-700">
          {t("patient.chatDisclaimer", "Cet assistant fournit des informations générales. Pour tout symptôme inquiétant, consultez un professionnel de santé.")}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[60vh] min-h-[420px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}>
                {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">P</span>}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                msg.role === 'assistant' ? 'bg-primary/5 border border-primary/10 rounded-tl-sm' : 'bg-muted rounded-tr-sm',
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 px-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{t("simulator.analyzing")}</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input placeholder={t("simulator.placeholder")} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading} className="h-10" />
          {speechSupported && (
            <Button size="icon" onClick={startListening} disabled={loading || listening}
              variant={listening ? "default" : "outline"}
              className="h-10 w-10 flex-shrink-0 relative">
              {listening ? (
                <>
                  <MicOff className="w-4 h-4 text-destructive animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
                </>
              ) : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || loading}
            className="h-10 w-10 flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
