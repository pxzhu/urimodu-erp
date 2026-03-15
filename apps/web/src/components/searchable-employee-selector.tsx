"use client";

import { useMemo, useState } from "react";

import { useLocaleText } from "./ui-shell-provider";

export interface EmployeeSelectorItem {
  id: string;
  employeeNumber: string;
  nameKr: string;
}

interface SearchableEmployeeSelectorProps {
  employees: EmployeeSelectorItem[];
  selectedEmployeeIds: string[];
  onChange: (nextIds: string[]) => void;
  label?: string;
  placeholder?: string;
  emptyText?: string;
  allowMultiple?: boolean;
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

export function SearchableEmployeeSelector({
  employees,
  selectedEmployeeIds,
  onChange,
  label,
  placeholder,
  emptyText,
  allowMultiple = true
}: SearchableEmployeeSelectorProps) {
  const [query, setQuery] = useState("");
  const t = useLocaleText();

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) => {
      const searchableText = `${employee.nameKr} ${employee.employeeNumber}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [employees, query]);

  function toggleEmployee(employeeId: string) {
    if (!allowMultiple) {
      onChange(selectedEmployeeIds[0] === employeeId ? [] : [employeeId]);
      return;
    }

    if (selectedEmployeeIds.includes(employeeId)) {
      onChange(selectedEmployeeIds.filter((id) => id !== employeeId));
      return;
    }

    onChange([...selectedEmployeeIds, employeeId]);
  }

  return (
    <div className="search-panel">
      {label ? <strong>{label}</strong> : null}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder ?? t("이름/사번 검색 (예: 홍)", "Search by name/employee number")}
      />
      <div className="search-results">
        {filteredEmployees.map((employee) => (
          <label key={employee.id}>
            <input
              type={allowMultiple ? "checkbox" : "radio"}
              checked={selectedEmployeeIds.includes(employee.id)}
              onChange={() => toggleEmployee(employee.id)}
              name={allowMultiple ? undefined : "employee-single-selector"}
            />
            <span>
              {employee.nameKr} ({employee.employeeNumber})
            </span>
          </label>
        ))}
        {filteredEmployees.length === 0 ? (
          <span className="empty-note">{emptyText ?? t("검색 결과가 없습니다.", "No matching employees.")}</span>
        ) : null}
      </div>
      <span className="empty-note">
        {t("선택된 인원", "Selected")}: {selectedEmployeeIds.length}
      </span>
    </div>
  );
}
