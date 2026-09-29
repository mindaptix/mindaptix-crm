/** Salary deductions only apply to work recorded on or after this policy date. */
export const SALARY_DEDUCTION_EFFECTIVE_DATE = "2026-09-28";

export function getSalaryDeductionStart(monthStart: string) {
  return monthStart > SALARY_DEDUCTION_EFFECTIVE_DATE ? monthStart : SALARY_DEDUCTION_EFFECTIVE_DATE;
}
