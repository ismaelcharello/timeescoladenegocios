"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { describeScan, type ScanFeedback, type ScanResult } from "@/lib/event-ticket-scan";
import { Icon } from "@/app/app/icons";

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;

const MESMO_QR_MS = 3500; // a câmera lê o mesmo QR vários quadros seguidos; sem isso um só ingresso vira dezenas de chamadas

/**
 * Leitura de ingressos na portaria. Três caminhos, porque a fila é caótica:
 * câmera (BarcodeDetector nativo), digitar/colar o código, e leitor USB ou
 * Bluetooth, que "digita" o código e dá Enter — cai no mesmo campo.
 *
 * LIMITE CONHECIDO: o Safari do iPhone não tem BarcodeDetector, então lá a
 * câmera não lê QR; o campo de código continua funcionando.
 */
export default function QrScanner({ eventId, onScanned }: { eventId: number; onScanned: () => void }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  // Detecção de recurso do NAVEGADOR: só existe no cliente. `useSyncExternalStore`
  // com um snapshot de servidor `false` evita o descasamento de hidratação sem
  // chamar setState dentro de um effect, que o React 19 reprova (renders em cascata).
  const cameraSupported = useSyncExternalStore(
    () => () => undefined,
    () => "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );

  const submit = useCallback(async (raw: string) => {
    const token = raw.trim();
    if (!token) return;
    const agora = Date.now();
    if (token === lastRef.current.token && agora - lastRef.current.at < MESMO_QR_MS) return;
    lastRef.current = { token, at: agora };
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/check-in`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan", token }),
      });
      const data = await response.json().catch(() => ({}));
      if (data && typeof data.result === "string") {
        const result = data as ScanResult;
        setFeedback(describeScan(result));
        if (result.result === "ok") onScanned();
      } else {
        // Sem decisão do servidor (sem rede, sem permissão): NUNCA mostrar verde.
        setFeedback({ tone: "stop", title: "Não foi possível validar", detail: typeof data?.error === "string" ? data.error : "Sem resposta do servidor. Não libere a entrada." });
      }
    } catch {
      setFeedback({ tone: "stop", title: "Sem conexão", detail: "Não foi possível validar o ingresso. Não libere a entrada." });
    } finally {
      setBusy(false);
    }
  }, [eventId, onScanned]);

  useEffect(() => {
    if (!cameraOn) return;
    let parar = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    (async () => {
      try {
        const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current;
        if (!video || parar) return;
        video.srcObject = stream;
        await video.play();
        const varrer = async () => {
          if (parar) return;
          try {
            const achados = await detector.detect(video);
            if (achados[0]?.rawValue) await submit(achados[0].rawValue);
          } catch { /* quadro sem QR ou vídeo ainda carregando: tenta o próximo */ }
          timer = window.setTimeout(varrer, 250);
        };
        void varrer();
      } catch {
        setCameraError("Não foi possível abrir a câmera. Permita o acesso nas configurações do navegador ou use o campo de código.");
        setCameraOn(false);
      }
    })();
    return () => {
      parar = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, submit]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(code);
    setCode("");
  }

  return (
    <section className="qr-scanner" aria-label="Ler ingresso">
      <header>
        <div><span>PORTARIA</span><h2>Ler ingresso</h2></div>
        {cameraSupported ? (
          <button type="button" className="qr-scanner-camera" onClick={() => { setCameraError(""); setCameraOn((v) => !v); }}>
            <Icon name="ticket" size={16} /> {cameraOn ? "Fechar câmera" : "Abrir câmera"}
          </button>
        ) : null}
      </header>
      {cameraOn ? <video ref={videoRef} className="qr-scanner-video" muted playsInline aria-label="Câmera para ler o QR do ingresso" /> : null}
      {cameraError ? <p className="qr-scanner-error" role="alert">{cameraError}</p> : null}
      {!cameraSupported ? <p className="qr-scanner-hint">Este navegador não lê QR pela câmera. Use um leitor USB/Bluetooth ou digite o código abaixo.</p> : null}
      <form onSubmit={onSubmit} className="qr-scanner-form">
        <label>
          <span>Código do ingresso</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="T1.12.345.…" autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="text" />
        </label>
        <button type="submit" disabled={busy || !code.trim()}>{busy ? "Validando…" : "Validar"}</button>
      </form>
      {feedback ? (
        <div className={`qr-scanner-result ${feedback.tone}`} role="status" aria-live="assertive">
          <strong>{feedback.title}</strong>
          <span>{feedback.detail}</span>
        </div>
      ) : null}
    </section>
  );
}
