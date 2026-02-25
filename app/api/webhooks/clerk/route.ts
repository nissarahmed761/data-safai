import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local"
    )
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    )
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 400 }
    )
  }

  const eventType = evt.type

  switch (eventType) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data
      const email = email_addresses?.[0]?.email_address
      const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null

      if (email) {
        await db.insert(users).values({
          clerkId: id,
          email,
          name,
          imageUrl: image_url,
        })
        console.log(`[webhook] user.created → DB: ${id}`)
      }
      break
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data
      const email = email_addresses?.[0]?.email_address
      const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null

      if (email) {
        await db
          .update(users)
          .set({ email, name, imageUrl: image_url, updatedAt: new Date() })
          .where(eq(users.clerkId, id))
        console.log(`[webhook] user.updated → DB: ${id}`)
      }
      break
    }

    case "user.deleted": {
      const { id } = evt.data
      if (id) {
        await db.delete(users).where(eq(users.clerkId, id))
        console.log(`[webhook] user.deleted → DB: ${id}`)
      }
      break
    }

    case "session.created":
    case "session.ended":
      console.log(`[webhook] ${eventType}:`, evt.data)
      break

    default:
      console.log(`[webhook] Unhandled event type: ${eventType}`)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
