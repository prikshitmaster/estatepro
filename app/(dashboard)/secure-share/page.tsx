"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSecureShareLinks,
  getShareViewLogs,
  toggleShareLinkActive,
  deleteSecureShareLink,
} from "@/lib/db/secure-share";
import { SecureShareLink, ShareViewLog } from "@/lib/types";

const ACCENT = "#6366F1"; // indigo — distinguishes Secure Share as a premium feature

export default function SecureSharePage() {
  const [links, setLinks]       = useState<SecureShareLink[]>([]);
  const [loading, setLoading]   = useState(true);

  // Analytics modal
  const [logsFor,  setLogsFor]  = useState<SecureShareLink | null>(null);
  const [logs,     setLogs]     = useState<ShareViewLog[]>([]);
  const [logsLoad, setLogsLoad] = useState(false);

  // Delete confirm
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // Copy toast
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getSecureShareLinks()
      .then(setLinks)
      .finally(() => setLoading(false));
  }, []);

  async function openLogs(link: SecureShareLink) {
    setLogsFor(link);
    setLogsLoad(true);
    const data = await getShareViewLogs(link.id).catch(() => []);
    setLogs(data);
    setLogsLoad(false);
  }

  async function handleToggle(link: SecureShareLink) {
    const next = !link.is_active;
    setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_active: next } : l));
    await toggleShareLinkActive(link.id, next).catch(() => {
      // revert on failure
      setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_active: link.is_active } : l));
    });
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await deleteSecureShareLink(id).catch(() => {});
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setDeleteId(null);
    setDeleting(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const totalViews  = links.reduce((s, l) => s + l.view_count, 0);
  const activeCount = links.filter((l) => l.is_active).length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: `${ACCENT}18` }}>
            <LockIcon color={ACCENT} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1A1D23' }}>Secure Share</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>Share property media via protected links</p>
          </div>
        </div>
        <Link
          href="/secure-share/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          style={{ background: ACCENT }}
        >
          <PlusIcon />
          Create Share Link
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard label="Total Links" value={loading ? "—" : links.length} />
        <KpiCard label="Active"      value={loading ? "—" : activeCount} accent={ACCENT} />
        <KpiCard label="Total Views" value={loading ? "—" : totalViews} />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EEF1F6' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse border-b border-[#F0F3F8]">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && links.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid #EEF1F6' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: `${ACCENT}12` }}>
            <LockIcon color={ACCENT} size={24} />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No share links yet</p>
          <p className="text-sm text-gray-400 mb-5">Create a link to share property media securely with leads</p>
          <Link
            href="/secure-share/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl"
            style={{ background: ACCENT }}
          >
            <PlusIcon />
            Create your first link
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && links.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EEF1F6' }}>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F3F8' }}>
                  {["Title", "Views", "Expires", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F3F8]">
                {links.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    copied={copied}
                    onCopy={copyLink}
                    onLogs={openLogs}
                    onToggle={handleToggle}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#F0F3F8]">
            {links.map((link) => (
              <MobileLinkCard
                key={link.id}
                link={link}
                copied={copied}
                onCopy={copyLink}
                onLogs={openLogs}
                onToggle={handleToggle}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mx-auto mb-4">
              <TrashIcon color="#EF4444" />
            </div>
            <h3 className="text-center text-base font-bold text-gray-900 mb-1">Delete this link?</h3>
            <p className="text-center text-sm text-gray-500 mb-5">
              All uploaded files and view history will be permanently deleted. Anyone who has this link will lose access.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View analytics modal */}
      {logsFor && (
        <Modal onClose={() => setLogsFor(null)}>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 mb-0.5">{logsFor.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{logsFor.view_count} total views</p>
            {logsLoad ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No views recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: '#F8F9FB' }}>
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {log.ip_address ?? "Anonymous"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(log.viewed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {log.user_agent && (
                      <span className="text-[10px] text-gray-400 max-w-[130px] truncate text-right">
                        {log.user_agent.replace(/.*?(Chrome|Firefox|Safari|Edge|Mobile).*/, "$1")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5" style={{ border: '1px solid #EEF1F6' }}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent ?? '#1A1D23' }}>{value}</p>
    </div>
  );
}

function expiryLabel(link: SecureShareLink): { text: string; color: string } {
  if (!link.expires_at) return { text: "Never", color: "#6B7280" };
  const d = new Date(link.expires_at);
  const now = new Date();
  if (d < now) return { text: "Expired", color: "#EF4444" };
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days <= 2) return { text: `${days}d left`, color: "#F59E0B" };
  return {
    text: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    color: "#6B7280",
  };
}

function LinkRow({
  link, copied, onCopy, onLogs, onToggle, onDelete,
}: {
  link: SecureShareLink;
  copied: string | null;
  onCopy: (t: string) => void;
  onLogs: (l: SecureShareLink) => void;
  onToggle: (l: SecureShareLink) => void;
  onDelete: (id: string) => void;
}) {
  const exp = expiryLabel(link);
  return (
    <tr className="hover:bg-[#F8F9FB] transition-colors">
      <td className="px-5 py-3.5">
        <p className="font-semibold text-gray-900 text-sm">{link.title}</p>
        {link.property_title && <p className="text-xs text-gray-400 mt-0.5">{link.property_title}</p>}
      </td>
      <td className="px-5 py-3.5">
        <button onClick={() => onLogs(link)} className="text-sm font-semibold hover:underline" style={{ color: ACCENT }}>
          {link.view_count}
          {link.max_views ? <span className="font-normal text-gray-400"> / {link.max_views}</span> : null}
        </button>
      </td>
      <td className="px-5 py-3.5 text-sm" style={{ color: exp.color }}>{exp.text}</td>
      <td className="px-5 py-3.5">
        <StatusBadge active={link.is_active} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 justify-end">
          <ActionBtn title={copied === link.token ? "Copied!" : "Copy link"} onClick={() => onCopy(link.token)}>
            {copied === link.token ? <CheckIcon /> : <CopyIcon />}
          </ActionBtn>
          <ActionBtn title="View analytics" onClick={() => onLogs(link)}>
            <ChartIcon />
          </ActionBtn>
          <ActionBtn title={link.is_active ? "Revoke link" : "Restore link"} onClick={() => onToggle(link)}>
            {link.is_active ? <EyeOffIcon /> : <EyeIcon />}
          </ActionBtn>
          <ActionBtn title="Delete" onClick={() => onDelete(link.id)} danger>
            <TrashIcon />
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function MobileLinkCard({
  link, copied, onCopy, onLogs, onToggle, onDelete,
}: {
  link: SecureShareLink;
  copied: string | null;
  onCopy: (t: string) => void;
  onLogs: (l: SecureShareLink) => void;
  onToggle: (l: SecureShareLink) => void;
  onDelete: (id: string) => void;
}) {
  const exp = expiryLabel(link);
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{link.title}</p>
          {link.property_title && <p className="text-xs text-gray-400 truncate">{link.property_title}</p>}
        </div>
        <StatusBadge active={link.is_active} />
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2.5">
        <span><strong style={{ color: ACCENT }}>{link.view_count}</strong> views</span>
        <span style={{ color: exp.color }}>Exp: {exp.text}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onCopy(link.token)}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
          style={{ borderColor: ACCENT, color: ACCENT, background: copied === link.token ? `${ACCENT}12` : 'white' }}
        >
          {copied === link.token ? "Copied!" : "Copy Link"}
        </button>
        <ActionBtn title="Analytics" onClick={() => onLogs(link)}><ChartIcon /></ActionBtn>
        <ActionBtn title={link.is_active ? "Revoke" : "Restore"} onClick={() => onToggle(link)}>
          {link.is_active ? <EyeOffIcon /> : <EyeIcon />}
        </ActionBtn>
        <ActionBtn title="Delete" onClick={() => onDelete(link.id)} danger><TrashIcon /></ActionBtn>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: active ? '#DCFCE7' : '#FEE2E2', color: active ? '#15803D' : '#DC2626' }}>
      {active ? "Active" : "Revoked"}
    </span>
  );
}

function ActionBtn({ title, onClick, children, danger }: {
  title: string; onClick: () => void; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
      style={{ color: danger ? '#EF4444' : '#9CA3AF' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? '#FEF2F2' : '#F5F7FA'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" style={{ border: '1px solid #EEF1F6' }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function LockIcon({ color = "currentColor", size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function PlusIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}
function CopyIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
}
function CheckIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="#10B981" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
}
function ChartIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function EyeOffIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;
}
function EyeIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
}
function TrashIcon({ color = "currentColor" }: { color?: string }) {
  return <svg className="w-3.5 h-3.5" fill="none" stroke={color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
