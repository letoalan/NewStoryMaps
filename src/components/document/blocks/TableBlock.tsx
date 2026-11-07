/**
 * StoryMap — Bloc Tableau de données (Mode 2 / Mode 3)
 */

import React from 'react';
import { Block } from '../../../types/project';
import { Plus, Trash2 } from 'lucide-react';

interface TableBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const TableBlock: React.FC<TableBlockProps> = ({ block, onChange, isEditable = true }) => {
  const headers = (block.data.headers as string[]) || ['Colonne 1', 'Colonne 2'];
  const rows = (block.data.rows as string[][]) || [['Donnée 1', 'Donnée 2']];

  const updateHeader = (colIdx: number, val: string) => {
    const updated = [...headers];
    updated[colIdx] = val;
    onChange({ headers: updated });
  };

  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    const updatedRows = rows.map((r, ri) => (ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? val : c)) : r));
    onChange({ rows: updatedRows });
  };

  const addRow = () => {
    const emptyRow = headers.map(() => '');
    onChange({ rows: [...rows, emptyRow] });
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    onChange({ rows: rows.filter((_, i) => i !== rowIdx) });
  };

  const addColumn = () => {
    const newHeaders = [...headers, `Col ${headers.length + 1}`];
    const newRows = rows.map((r) => [...r, '']);
    onChange({ headers: newHeaders, rows: newRows });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '8px' }}>
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
              {headers.map((h, ci) => (
                <th key={ci} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>
                  {isEditable ? (
                    <input
                      type="text"
                      className="input"
                      value={h}
                      onChange={(e) => updateHeader(ci, e.target.value)}
                      style={{ width: '100%', height: '22px', fontSize: '11px', fontWeight: 600 }}
                    />
                  ) : (
                    h
                  )}
                </th>
              ))}
              {isEditable && <th style={{ width: '28px' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--border-soft, #e2e8f0)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '4px 6px' }}>
                    {isEditable ? (
                      <input
                        type="text"
                        className="input"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        style={{ width: '100%', height: '22px', fontSize: '11px' }}
                      />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
                {isEditable && (
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-icon"
                      onClick={() => removeRow(ri)}
                      title="Supprimer la ligne"
                    >
                      <Trash2 size={12} color="var(--danger)" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditable && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={addRow}>
            <Plus size={12} /> Ajouter ligne
          </button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={addColumn}>
            <Plus size={12} /> Ajouter colonne
          </button>
        </div>
      )}
    </div>
  );
};

