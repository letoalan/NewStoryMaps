/**
 * StoryMap — Styles CSS pour la publication autonome (Document interactif & Brochure A4)
 */

export function getDocumentViewerStyles(safeAccent: string): string {
  return `* { box-sizing: border-box; }
body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0f172a; color:#f8fafc; min-height:100vh; display:flex; flex-direction:column; }
header { height:52px; background:rgba(15,23,42,0.95); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between; padding:0 16px; z-index:20; }
footer { height:48px; background:rgba(15,23,42,0.95); border-top:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; gap:16px; }
main { flex:1; overflow:auto; display:flex; justify-content:center; align-items:center; padding:24px; gap:28px; }
main.profile-vertical { flex-direction:column; align-items:center; justify-content:flex-start; }
main.profile-horizontal { flex-direction:row; align-items:flex-start; justify-content:flex-start; }
.btn { padding:6px 11px; background:#1e293b; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; }
.btn:disabled { opacity:0.35; cursor:default; }
.btn.active, .btn-primary { background:${safeAccent}; border-color:${safeAccent}; }
.dot { width:10px; height:10px; padding:0; border:none; border-radius:5px; background:rgba(255,255,255,0.35); cursor:pointer; transition:all 0.2s; }
.dot[aria-current="page"] { width:20px; background:${safeAccent}; }
.binding-pill { display:inline-flex; align-items:center; gap:3px; background:rgba(11,127,176,0.12); color:${safeAccent}; border:1px solid ${safeAccent}; padding:1px 7px; border-radius:999px; font-size:10px; font-weight:600; margin-bottom:4px; cursor:pointer; }
#toc-drawer { display:none; position:fixed; top:52px; left:0; bottom:0; width:260px; background:#1e293b; border-right:1px solid rgba(255,255,255,0.12); z-index:30; padding:14px; overflow-y:auto; }
.toc-item { display:block; width:100%; text-align:left; padding:8px 10px; border:0; border-radius:6px; background:transparent; color:#cbd5e1; cursor:pointer; font-size:13px; margin-bottom:4px; }
.toc-item[aria-current="page"] { background:${safeAccent}; color:#fff; }`;
}

export function getBrochurePrintStyles(safeAccent: string, pageOrientation: string, dims: { physicalWidthMm: number; physicalHeightMm: number; marginMm: number }): string {
  return `@page { size: A4 ${pageOrientation}; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#334155; color:#0f172a; }
.print-toolbar { position:sticky; top:0; z-index:50; height:52px; background:#0f172a; color:#f8fafc; display:flex; align-items:center; justify-content:space-between; padding:0 20px; border-bottom:1px solid rgba(255,255,255,0.12); }
.btn-print { padding:7px 14px; background:${safeAccent}; color:#fff; border:none; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer; }
.btn-print:disabled { opacity:0.4; cursor:not-allowed; background:#64748b; }
.sheets-container { display:flex; flex-direction:column; align-items:center; padding:24px; gap:24px; }
.brochure-sheet { width:${dims.physicalWidthMm}mm; height:${dims.physicalHeightMm}mm; padding:${dims.marginMm}mm; background:#ffffff; box-shadow:0 8px 28px rgba(0,0,0,0.35); display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; page-break-after:always; break-after:page; }
.brochure-sheet:last-child { page-break-after:auto; break-after:auto; }
.sheet-header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${safeAccent}; padding-bottom:6px; margin-bottom:10px; }
.sheet-footer { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:6px; margin-top:10px; font-size:10px; color:#475569; }
.binding-pill { display:inline-flex; align-items:center; gap:3px; background:#f0f9ff; color:${safeAccent}; border:1px solid ${safeAccent}; padding:1px 7px; border-radius:999px; font-size:10px; font-weight:700; margin-bottom:4px; }
@media print {
    body { background:#ffffff; }
    .no-print { display:none !important; }
    .sheets-container { padding:0; gap:0; }
    .brochure-sheet { box-shadow:none; margin:0; }
}`;
}

