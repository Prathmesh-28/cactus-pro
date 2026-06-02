/**
 * TOOL TEMPLATE — copy this file when building a new tool.
 *
 * Steps:
 *  1. cp _template.tsx YourToolName.tsx
 *  2. Replace all "Template" with your tool name
 *  3. Build your UI inside the return()
 *  4. Register in _registry.tsx
 *  5. Change tag to 'Built' in VCToolkitPage.tsx FW array
 */

import { useState } from 'react';
// import { useApp } from '../../../context/AppContext'; // uncomment if you need store data

export default function TemplateTool() {
  // const { store } = useApp();
  const [result, setResult] = useState<string | null>(null);

  // ── Your tool state ────────────────────────────────────────────────────────
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

  const calculate = () => {
    // ── Your calculation logic ───────────────────────────────────────────────
    setResult(`Result: ${input1} + ${input2}`);
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Input 1</label>
          <input className={ic} value={input1} onChange={e => setInput1(e.target.value)} placeholder="Enter value..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Input 2</label>
          <input className={ic} value={input2} onChange={e => setInput2(e.target.value)} placeholder="Enter value..." />
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={calculate}
        className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white shadow-sm"
        style={{ backgroundColor: '#1C4B42' }}
      >
        Calculate
      </button>

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 p-5" style={{ borderColor: '#86CA0F', backgroundColor: '#F6FAF7' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Result</p>
          <p className="text-2xl font-bold" style={{ color: '#1C4B42' }}>{result}</p>
        </div>
      )}
    </div>
  );
}
