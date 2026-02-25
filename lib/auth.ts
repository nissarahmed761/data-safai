import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Get the current DB user from the Clerk session.
 * Auto-creates the DB record if the user signed up before the webhook was wired.
 */
export async function getDbUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  // Try to find existing DB user
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (existing) return existing

  // Auto-create from Clerk data (handles users who signed up before webhook)
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) return null

  const name =
    `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name, imageUrl: clerkUser.imageUrl, updatedAt: new Date() },
    })
    .returning()

  return newUser
}
