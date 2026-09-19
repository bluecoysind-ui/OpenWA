import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Send, Upload, X } from "lucide-react";
import {
  cancelBatch,
  checkNumber,
  fileToBase64,
  forwardMessage,
  sendBulk,
  sendContact,
  sendLocation,
  sendPoll,
  sendSticker,
  sendText,
  sendTypedMedia,
  type BatchStatusResponse,
  type SendMediaPayload,
} from "@/lib/openwa-api";
import { useAppToast } from "@/lib/openwa/useToast";
import { useBatchStatusQuery, useGroupsQuery, useSessionsQuery } from "@/lib/openwa-query";
import { btn, Card, ErrorLine, field, ghost } from "./ui";

const messageTypes = ["text", "image", "video", "audio", "document", "location", "contact", "sticker", "poll", "forward", "bulk"] as const;
type MessageType = (typeof messageTypes)[number];
const mediaTypes: readonly string[] = ["image", "video", "audio", "document", "sticker"];
const MEDIA_UPLOAD_MAX_BYTES = 18 * 1024 * 1024;

export function MessageTesterPanel() {
  const toast = useAppToast();
  const sessionsQ = useSessionsQuery();
  const ready = (sessionsQ.data ?? []).filter((s) => s.status === "ready");
  const [sessionId, setSessionId] = useState("");
  const sid = sessionId || ready[0]?.id || "";
  const [recipient, setRecipient] = useState("");
  const [recipientType, setRecipientType] = useState<"personal" | "group">("personal");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<{ base64: string; mimetype: string; filename: string } | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [forwardFrom, setForwardFrom] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardMessageId, setForwardMessageId] = useState("");
  const [bulkRecipients, setBulkRecipients] = useState("");
  const [bulkDelay, setBulkDelay] = useState("1500");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [batchSession, setBatchSession] = useState("");
  const groupsQ = useGroupsQuery(sid, recipientType === "group" && Boolean(sid));
  const batchQ = useBatchStatusQuery(batchSession, batchId, Boolean(batchId));
  const fileRef = useRef<HTMLInputElement>(null);
  const chatId = recipientType === "group" ? selectedGroup : recipient;
  const mediaPayload: SendMediaPayload | null = useMemo(() => {
    if (mediaFile) return { base64: mediaFile.base64, mimetype: mediaFile.mimetype, filename: mediaFile.filename, caption: content || undefined };
    if (mediaUrl.trim()) return { url: mediaUrl.trim(), caption: content || undefined };
    return null;
  }, [mediaFile, mediaUrl, content]);

  const onPickMedia = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
      toast.error("File too large", "Max ~18 MiB for base64 uploads.");
      return;
    }
    setMediaUrl("");
    setMediaFile(await fileToBase64(file));
  };

  const send = async () => {
    if (!sid) return;
    setSending(true);
    setResult(null);
    try {
      if (messageType === "text") {
        const res = await sendText(sid, chatId, content);
        setResult(JSON.stringify(res, null, 2));
      } else if (mediaTypes.includes(messageType)) {
        if (!mediaPayload) throw new Error("Pick a file or enter a media URL");
        if (messageType === "sticker") setResult(JSON.stringify(await sendSticker(sid, chatId, mediaPayload), null, 2));
        else setResult(JSON.stringify(await sendTypedMedia(sid, chatId, messageType as "image" | "video" | "audio" | "document", mediaPayload), null, 2));
      } else if (messageType === "location") {
        setResult(JSON.stringify(await sendLocation(sid, { chatId, latitude: Number(latitude), longitude: Number(longitude), description: locationDescription || undefined, address: locationAddress || undefined }), null, 2));
      } else if (messageType === "contact") {
        setResult(JSON.stringify(await sendContact(sid, { chatId, contactName, contactNumber }), null, 2));
      } else if (messageType === "poll") {
        setResult(JSON.stringify(await sendPoll(sid, { chatId, name: pollQuestion, options: pollOptions.map((o) => o.trim()).filter(Boolean), allowMultipleAnswers }), null, 2));
      } else if (messageType === "forward") {
        setResult(JSON.stringify(await forwardMessage(sid, { fromChatId: forwardFrom, toChatId: forwardTo, messageId: forwardMessageId }), null, 2));
      } else if (messageType === "bulk") {
        const numbers = bulkRecipients.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
        const messages = [];
        for (const number of numbers) {
          const checked = await checkNumber(sid, number.replace(/\D/g, ""));
          const id = checked.whatsappId || number;
          messages.push({ chatId: id, type: "text" as const, content: { text: content } });
        }
        const batch = await sendBulk(sid, {
          messages,
          options: { delayBetweenMessages: Number(bulkDelay) || 1500, randomizeDelay: true },
        });
        setBatchSession(sid);
        setBatchId(batch.batchId);
        setResult(JSON.stringify(batch, null, 2));
      }
      toast.success("Sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      setResult(message);
      toast.error("Send failed", message);
    } finally {
      setSending(false);
    }
  };

  const batch: BatchStatusResponse | undefined = batchQ.data;

  return (
    <div className="space-y-3">
      <ErrorLine error={sessionsQ.error ?? groupsQ.error ?? batchQ.error} />
      <Card title="Message tester" sub="Send every OpenWA message type against a ready session.">
        {sessionsQ.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <select className={field} value={sid} onChange={(e) => setSessionId(e.target.value)}>
            {ready.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.phone ? `(${s.phone})` : ""}
              </option>
            ))}
          </select>
          <select className={field} value={messageType} onChange={(e) => setMessageType(e.target.value as MessageType)}>
            {messageTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {messageType !== "forward" && messageType !== "bulk" ? (
            <>
              <select className={field} value={recipientType} onChange={(e) => setRecipientType(e.target.value as "personal" | "group")}>
                <option value="personal">Personal</option>
                <option value="group">Group</option>
              </select>
              {recipientType === "group" ? (
                <select className={field} value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                  <option value="">Select group</option>
                  {(groupsQ.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={field} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="chatId or phone" />
              )}
            </>
          ) : null}
        </div>
        {messageType === "text" || mediaTypes.includes(messageType) || messageType === "bulk" ? (
          <textarea className={`${field} mt-2 min-h-24`} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message / caption" />
        ) : null}
        {mediaTypes.includes(messageType) ? (
          <div className="mt-2 space-y-2">
            <input className={field} value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); setMediaFile(null); }} placeholder="https://… media URL" />
            <div className="flex gap-2">
              <button type="button" className={ghost} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Upload file
              </button>
              {mediaFile ? (
                <button type="button" className={ghost} onClick={() => setMediaFile(null)}>
                  <X size={14} /> {mediaFile.filename}
                </button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onPickMedia(e)} />
          </div>
        ) : null}
        {messageType === "location" ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input className={field} value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" />
            <input className={field} value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" />
            <input className={field} value={locationDescription} onChange={(e) => setLocationDescription(e.target.value)} placeholder="Description" />
            <input className={field} value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="Address" />
          </div>
        ) : null}
        {messageType === "contact" ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input className={field} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
            <input className={field} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact number" />
          </div>
        ) : null}
        {messageType === "poll" ? (
          <div className="mt-2 space-y-2">
            <input className={field} value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Question" />
            {pollOptions.map((opt, i) => (
              <input key={i} className={field} value={opt} onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))} placeholder={`Option ${i + 1}`} />
            ))}
            {pollOptions.length < 12 ? (
              <button type="button" className={ghost} onClick={() => setPollOptions([...pollOptions, ""])}>
                Add option
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowMultipleAnswers} onChange={(e) => setAllowMultipleAnswers(e.target.checked)} />
              Allow multiple answers
            </label>
          </div>
        ) : null}
        {messageType === "forward" ? (
          <div className="mt-2 grid gap-2">
            <input className={field} value={forwardFrom} onChange={(e) => setForwardFrom(e.target.value)} placeholder="From chatId" />
            <input className={field} value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="To chatId" />
            <input className={field} value={forwardMessageId} onChange={(e) => setForwardMessageId(e.target.value)} placeholder="Message id" />
          </div>
        ) : null}
        {messageType === "bulk" ? (
          <div className="mt-2 space-y-2">
            <textarea className={`${field} min-h-24`} value={bulkRecipients} onChange={(e) => setBulkRecipients(e.target.value)} placeholder="One number per line" />
            <input className={field} value={bulkDelay} onChange={(e) => setBulkDelay(e.target.value)} placeholder="Delay ms" />
          </div>
        ) : null}
        <button type="button" className={`${btn} mt-3`} disabled={sending || !sid} onClick={() => void send()}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
        </button>
      </Card>
      {batch ? (
        <Card title={`Batch ${batch.batchId}`} sub={batch.status}>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-wa" style={{ width: `${batch.progress.total ? (100 * (batch.progress.sent + batch.progress.failed)) / batch.progress.total : 0}%` }} />
          </div>
          <p className="text-[12px] text-muted">
            {batch.progress.sent} sent · {batch.progress.failed} failed · {batch.progress.pending} pending · {batch.progress.total} total
          </p>
          {batch.status === "processing" || batch.status === "pending" ? (
            <button
              type="button"
              className={`${ghost} mt-2`}
              onClick={() => void cancelBatch(batchSession, batch.batchId).then(() => toast.success("Cancel requested"))}
            >
              Cancel batch
            </button>
          ) : null}
        </Card>
      ) : null}
      {result ? <pre className="scroll-thin max-h-64 overflow-auto rounded-2xl border border-line bg-night/40 p-3 text-[11px] text-muted">{result}</pre> : null}
    </div>
  );
}
