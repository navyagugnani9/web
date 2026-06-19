/**
 * Submit a form to the public notification endpoint.
 * Sends an email to the configured internal recipient (recruitment@acadhire.co.in).
 */
export async function submitFormNotification(params: {
  formType: string
  fields: Array<{ label: string; value: string | number | undefined | null }>
}): Promise<void> {
  const cleanFields = params.fields.map((f) => ({
    label: f.label,
    value: f.value == null || f.value === '' ? '—' : String(f.value),
  }))

  const res = await fetch('/api/public/form-submission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formType: params.formType, fields: cleanFields }),
  })

  if (!res.ok) {
    throw new Error(`Submission failed (${res.status})`)
  }
}
