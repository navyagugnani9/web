import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { Resend } from 'resend'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'AcadHire'
const FROM_DOMAIN = 'notify.acadhire.co.in'

const FieldSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().max(5000),
})

const BodySchema = z.object({
  formType: z.string().min(1).max(80),
  fields: z.array(FieldSchema).min(1).max(40),
})

export const Route = createFileRoute('/api/public/form-submission')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const resendApiKey = process.env.RESEND_API_KEY

        if (!resendApiKey) {
          console.error('RESEND_API_KEY is not set')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let parsed
        try {
          parsed = BodySchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const template = TEMPLATES['form-notification']
        if (!template || !template.to) {
          return Response.json({ error: 'Notification template unavailable' }, { status: 500 })
        }

        const templateData = {
          formType: parsed.formType,
          fields: parsed.fields,
          submittedAt: new Date().toISOString(),
        }

        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        try {
          const resend = new Resend(resendApiKey)
          const { error } = await resend.emails.send({
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            to: template.to,
            replyTo:
              parsed.fields.find((f) => /email/i.test(f.label))?.value || undefined,
            subject,
            html,
            text,
          })

          if (error) {
            console.error('Resend error:', error)
            return Response.json({ error: 'Failed to send' }, { status: 500 })
          }
        } catch (err) {
          console.error('Failed to send email:', err)
          return Response.json({ error: 'Failed to send' }, { status: 500 })
        }

        return Response.json({ success: true })
      },
    },
  },
})
