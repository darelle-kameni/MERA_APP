import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Wifi, Smartphone } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WiFiQrModal({ open, onOpenChange }) {
  const canvasRef = useRef(null);
  const ssid = localStorage.getItem("mera_wifi_ssid") || "";
  const pass = localStorage.getItem("mera_wifi_password") || "";

  useEffect(() => {
    if (!open || !ssid) return;
    const timer = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const wifiString = pass
        ? `WIFI:T:WPA;S:${ssid};P:${pass};;`
        : `WIFI:T:nopass;S:${ssid};;`;
      QRCode.toCanvas(canvasRef.current, wifiString, {
        width: 280,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [open, ssid, pass]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `wifi-${ssid.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code téléchargé");
  };

  if (!ssid) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> WiFi non configuré
            </DialogTitle>
            <DialogDescription>
              Aucun réseau WiFi configuré. Allez dans <strong>Paramètres</strong> pour définir le SSID et le mot de passe.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" /> WiFi — {ssid}
          </DialogTitle>
          <DialogDescription>
            Scannez ce QR code avec votre téléphone pour vous connecter au réseau.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="bg-white p-3 rounded-xl shadow-sm border">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Smartphone className="w-3.5 h-3.5" />
          Ouvrez l'appareil photo ou un lecteur QR code
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button className="flex-1" onClick={handleDownload}>
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
