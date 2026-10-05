// Column mapper for files the sniffer could not place, or when the user asks to choose the columns.
import { useState } from 'react';
import type { DateOrder, ParseSpec } from '../engine';
import { formatDate, formatMoney } from '../copy';
import { previewRows, specFromChoice, type FileReport, type MapChoice } from '../pipeline';

export function Mapper({ file, text, onApply }: { file: FileReport; text: string; onApply: (spec: ParseSpec) => void }) {
  const sniff = file.sniffSpec;
  const mapping = sniff.mapping;
  const columns = file.columns;
  const [date, setDate] = useState(mapping?.date ?? 0);
  const [description, setDescription] = useState(mapping?.description ?? 0);
  const [split, setSplit] = useState(mapping ? mapping.amount === undefined : false);
  const [amount, setAmount] = useState(mapping?.amount ?? 0);
  const [debit, setDebit] = useState(mapping?.debit ?? 0);
  const [credit, setCredit] = useState(mapping?.credit ?? 0);
  const [sign, setSign] = useState<'debit-negative' | 'charge-positive'>(
    sniff.signConvention === 'charge-positive' ? 'charge-positive' : 'debit-negative',
  );
  const [dateOrder, setDateOrder] = useState<DateOrder>(sniff.dateOrder);

  const choice: MapChoice = {
    delimiter: sniff.delimiter, headerLine: sniff.headerLine, date, description, sign, dateOrder,
    ...(split ? { debit, credit } : { amount }),
  };
  const spec = specFromChoice(choice);
  const preview = previewRows(text, spec, false);
  const columnOptions = columns.map((name, i) => (
    <option key={i} value={i}>{name || `Column ${i + 1}`}</option>
  ));

  return (
    <div className="mapper">
      <h4>Choose the columns</h4>
      <label className="field">
        Date column
        <select value={date} onChange={(e) => setDate(Number(e.target.value))}>{columnOptions}</select>
      </label>
      <label className="field">
        Description column
        <select value={description} onChange={(e) => setDescription(Number(e.target.value))}>{columnOptions}</select>
      </label>
      <fieldset className="choice">
        <legend>Amounts</legend>
        <label><input type="radio" name={`amounts-${file.source}`} checked={!split} onChange={() => setSplit(false)} /> One amount column</label>
        <label><input type="radio" name={`amounts-${file.source}`} checked={split} onChange={() => setSplit(true)} /> Separate debit and credit columns</label>
      </fieldset>
      {split ? (
        <>
          <label className="field">
            Debit column (money out)
            <select value={debit} onChange={(e) => setDebit(Number(e.target.value))}>{columnOptions}</select>
          </label>
          <label className="field">
            Credit column (money in)
            <select value={credit} onChange={(e) => setCredit(Number(e.target.value))}>{columnOptions}</select>
          </label>
        </>
      ) : (
        <label className="field">
          Amount column
          <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>{columnOptions}</select>
        </label>
      )}
      {!split && (
        <label className="field">
          Purchases in this file are
          <select value={sign} onChange={(e) => setSign(e.target.value as 'debit-negative' | 'charge-positive')}>
            <option value="debit-negative">negative (money out has a minus sign)</option>
            <option value="charge-positive">positive (purchases have no minus sign)</option>
          </select>
        </label>
      )}
      <label className="field">
        Date order
        <select value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
          <option value="MDY">Month/day/year</option>
          <option value="DMY">Day/month/year</option>
          <option value="YMD">Year-month-day</option>
        </select>
      </label>
      {preview.length > 0 ? (
        <table className="preview">
          <caption>The first {preview.length} rows, as we would read them</caption>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Amount</th></tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.date)}</td>
                <td>{row.description}</td>
                <td>{formatMoney(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="problem">No rows read with these columns. Check the date order and the sign.</p>
      )}
      <button type="button" className="button primary" onClick={() => onApply(spec)} disabled={preview.length === 0}>
        Use these columns
      </button>
    </div>
  );
}
