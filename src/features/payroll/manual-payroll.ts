/** Automatic attendance, holiday, DSR and task penalties are excluded. */
export function calculateManualPayroll(gross: number, fixedDeductions: number, manualDeductions: number, rewards: number) {
  const totalDeductions = fixedDeductions + manualDeductions;
  return { totalDeductions, netSalary: Math.max(0, Math.round((gross + rewards - totalDeductions) * 100) / 100) };
}
