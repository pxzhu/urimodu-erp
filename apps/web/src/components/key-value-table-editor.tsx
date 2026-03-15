"use client";

import { useLocaleText } from "./ui-shell-provider";

export interface KeyValueRow {
  key: string;
  value: string;
}

interface KeyValueTableEditorProps {
  rows: KeyValueRow[];
  onChange: (nextRows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyReadOnly?: boolean;
  hideRemove?: boolean;
}

export function KeyValueTableEditor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  keyReadOnly = false,
  hideRemove = false
}: KeyValueTableEditorProps) {
  const t = useLocaleText();

  function updateRow(index: number, field: keyof KeyValueRow, value: string) {
    onChange(
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  }

  function removeRow(index: number) {
    if (rows.length <= 1) {
      return;
    }
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function appendRow() {
    onChange([...rows, { key: "", value: "" }]);
  }

  return (
    <>
      <table className="kv-grid">
        <thead>
          <tr>
            <th>{t("항목", "Field")}</th>
            <th>{t("값", "Value")}</th>
            <th>{t("동작", "Action")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`kv-${index}`}>
              <td>
                <input
                  value={row.key}
                  readOnly={keyReadOnly}
                  onChange={(event) => updateRow(index, "key", event.target.value)}
                  placeholder={keyPlaceholder ?? t("필드명", "Field name")}
                />
              </td>
              <td>
                <input
                  value={row.value}
                  onChange={(event) => updateRow(index, "value", event.target.value)}
                  placeholder={valuePlaceholder ?? t("입력값", "Value")}
                />
              </td>
              <td>
                {hideRemove ? (
                  <span className="empty-note">-</span>
                ) : (
                  <button type="button" onClick={() => removeRow(index)} disabled={rows.length <= 1}>
                    {t("행 삭제", "Remove")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hideRemove ? (
        <button type="button" onClick={appendRow}>
          {t("행 추가", "Add row")}
        </button>
      ) : null}
    </>
  );
}
