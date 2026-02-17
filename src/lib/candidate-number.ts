import { prisma } from "./prisma";

// Excludes visually ambiguous characters: I/1, O/0
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

export function generateRandomCandidateNumber(): string {
  let result = "";
  for (let i = 0; i < LENGTH; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}

export async function generateUniqueCandidateNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateRandomCandidateNumber();
    const existing = await prisma.user.findUnique({
      where: { kandidatnummer: candidate },
    });
    if (!existing) return candidate;
    attempts++;
  }
  throw new Error("Failed to generate unique candidate number after 10 attempts");
}
