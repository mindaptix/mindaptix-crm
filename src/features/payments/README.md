# Payments

Payments owns its UI, form contracts, data access and mutations. The dashboard supplies navigation, authentication and role-based route dispatch; it does not load payment records in its overview.

## Request flow

`app/dashboard/payments/page.tsx` → dashboard route dispatcher → leadership page → `server/page-data.ts` → `components/client-payments-panel.tsx`.

The shared dispatcher enforces the navigation access rules for super admins and managers. Server actions independently check authorization before writing records.

## Responsibilities

- `types.ts`: serializable payment view models and form state; safe for client and server imports.
- `presentation.ts`: action colors, status colors and currency formatting; no database imports.
- `server/page-data.ts`: server-only MongoDB queries and page data assembly. Existing recurring invoice generation still runs here when the page loads.
- `actions.ts`: server actions for creating, updating, deleting and recording installments.
- `components/client-payments-panel.tsx`: page composition, filters and modal state.
- `components/payment-modal.tsx`: create/edit form orchestration.
- `components/payment-fields.tsx`: form controls and recurring-payment inputs.
- `components/payment-card.tsx`: one invoice, history and available actions.
- `components/record-installment-form.tsx`: installment submission.
- `components/stat-card.tsx` and `status-badge.tsx`: display components.

Import specific modules rather than a barrel that mixes server and client exports. Payment persistence continues to use the shared sales-payment MongoDB model, since project and sales views also reference those records.
