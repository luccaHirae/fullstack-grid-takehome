'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Sheet } from '@/types';

export default function HomePage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [newSheetName, setNewSheetName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const response = await fetch('/api/sheets');
      if (response.ok) {
        const data = await response.json();
        setSheets(data);
      }
    } catch (error) {
      console.error('Failed to fetch sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSheet = async () => {
    if (!newSheetName.trim()) return;

    try {
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSheetName,
          rows: 20,
          cols: 10,
        }),
      });

      if (response.ok) {
        const sheet = await response.json();
        setSheets([...sheets, sheet]);
        setNewSheetName('');
      }
    } catch (error) {
      console.error('Failed to create sheet:', error);
    }
  };

  if (loading)
    return (
      <div className='home-container'>
        <div className='panel'>
          <div className='panel-title'>Loading sheets…</div>
        </div>
      </div>
    );

  return (
    <div className='home-container'>
      <header className='home-header'>
        <h1 className='home-title'>TinyGrid</h1>
        <p className='home-subtitle'>
          Lightweight spreadsheet prototype with formulas (coming soon) and fast
          interaction.
        </p>
      </header>

      <section className='panel'>
        <div className='panel-header'>
          <div>
            <h2 className='panel-title'>Create New Sheet</h2>
            <p className='panel-desc'>
              Spin up a blank grid with up to 20×10 cells.
            </p>
          </div>
        </div>
        <div className='actions-row'>
          <input
            type='text'
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            placeholder='Sheet name…'
            className='input-text flex-1 min-w-[200px]'
            onKeyDown={(e) => {
              if (e.key === 'Enter') createSheet();
            }}
          />
          <button className='btn-accent' onClick={createSheet}>
            Create Sheet
          </button>
        </div>
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <h2 className='panel-title'>Your Sheets</h2>
          <span className='panel-desc'>{sheets.length} total</span>
        </div>
        {sheets.length === 0 ? (
          <div className='empty-state'>
            No sheets yet. Create your first sheet above.
          </div>
        ) : (
          <ul className='sheet-list'>
            {sheets.map((sheet) => (
              <li key={sheet.id} className='sheet-card'>
                <Link href={`/s/${sheet.id}`}>{sheet.name}</Link>
                <span className='sheet-card-meta'>
                  Size {sheet.rows} × {sheet.cols}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
