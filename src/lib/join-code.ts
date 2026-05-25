import { prisma } from "./prisma";

// Unambiguous chars — removes 0/O, 1/I/L to avoid confusion when reading aloud or handwriting
const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}

export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.group.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  // Extremely unlikely with 31^6 = 887M combinations and realistic group counts
  throw new Error("Kunne ikke generere unik gruppekode — prøv igjen");
}
