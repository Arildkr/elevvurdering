import { prisma } from "./prisma";

interface TextEntry {
  id: string;
  authorId: string;
}

interface ExistingAssignment {
  textId: string;
  reviewerId: string;
}

interface AffectedAssignment {
  id: string;
  assignmentId: string;
  reviewerId: string;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Distributes review assignments for an assignment.
 * Each student who submitted a text is assigned up to minReviews other texts.
 * Already-assigned reviewers get topped up to minReviews without being reassigned.
 * Returns the number of new assignments created.
 */
export async function distributeReviews(assignmentId: string): Promise<number> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { minReviews: true },
  });
  const minReviews = assignment?.minReviews ?? 1;

  const texts: TextEntry[] = await prisma.text.findMany({
    where: {
      assignmentId,
      author: { isActive: true },
    },
    select: { id: true, authorId: true },
  });

  if (texts.length < 2) {
    throw new Error("Trenger minst 2 innleveringer for å fordele reviews");
  }

  // Get existing active assignments to avoid duplicates
  const existingAssignments: ExistingAssignment[] = await prisma.reviewAssignment.findMany({
    where: { assignmentId, isActive: true },
    select: { textId: true, reviewerId: true },
  });

  const existingSet = new Set(
    existingAssignments.map((a: ExistingAssignment) => `${a.textId}:${a.reviewerId}`)
  );

  // Count how many assignments each reviewer already has
  const assignmentCountByReviewer = new Map<string, number>();
  for (const ea of existingAssignments) {
    assignmentCountByReviewer.set(
      ea.reviewerId,
      (assignmentCountByReviewer.get(ea.reviewerId) || 0) + 1
    );
  }

  // Count existing assignments per text for fair distribution
  const assignmentCountByText = new Map<string, number>();
  for (const ea of existingAssignments) {
    assignmentCountByText.set(
      ea.textId,
      (assignmentCountByText.get(ea.textId) || 0) + 1
    );
  }

  // Shuffle reviewers for randomness
  const reviewers = shuffleArray(texts.map((t: TextEntry) => t.authorId));

  const newAssignments: {
    assignmentId: string;
    textId: string;
    reviewerId: string;
  }[] = [];

  for (const reviewerId of reviewers) {
    const existingCount = assignmentCountByReviewer.get(reviewerId) || 0;
    const needed = minReviews - existingCount;
    if (needed <= 0) continue;

    for (let i = 0; i < needed; i++) {
      // Find eligible texts: not own, not already assigned to this reviewer
      const eligible = texts.filter(
        (t: TextEntry) =>
          t.authorId !== reviewerId &&
          !existingSet.has(`${t.id}:${reviewerId}`)
      );

      if (eligible.length === 0) break;

      // Pick text with fewest existing assignments (fair distribution)
      const sorted = [...eligible].sort(
        (a: TextEntry, b: TextEntry) =>
          (assignmentCountByText.get(a.id) || 0) -
          (assignmentCountByText.get(b.id) || 0)
      );

      // Among texts with same minimum count, pick randomly
      const minCount = assignmentCountByText.get(sorted[0].id) || 0;
      const candidates = sorted.filter(
        (t: TextEntry) => (assignmentCountByText.get(t.id) || 0) === minCount
      );
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      newAssignments.push({ assignmentId, textId: chosen.id, reviewerId });

      existingSet.add(`${chosen.id}:${reviewerId}`);
      assignmentCountByText.set(
        chosen.id,
        (assignmentCountByText.get(chosen.id) || 0) + 1
      );
      assignmentCountByReviewer.set(reviewerId, (assignmentCountByReviewer.get(reviewerId) || 0) + 1);
    }
  }

  if (newAssignments.length > 0) {
    await prisma.reviewAssignment.createMany({
      data: newAssignments,
      skipDuplicates: true,
    });
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { distributionDone: true },
  });

  return newAssignments.length;
}

/**
 * Finds a text for voluntary additional review.
 * Prioritizes texts with fewest reviews.
 */
export async function findTextForAdditionalReview(
  assignmentId: string,
  reviewerId: string
): Promise<TextEntry | null> {
  const texts = await prisma.text.findMany({
    where: {
      assignmentId,
      authorId: { not: reviewerId },
      author: { isActive: true },
      reviewAssignments: {
        none: {
          reviewerId,
          isActive: true,
        },
      },
    },
    include: {
      _count: {
        select: { reviews: true },
      },
    },
    orderBy: {
      reviews: { _count: "asc" },
    },
  });

  if (texts.length === 0) return null;

  const minReviews = texts[0]._count.reviews;
  const candidates = texts.filter((t: typeof texts[number]) => t._count.reviews === minReviews);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  return { id: chosen.id, authorId: chosen.authorId };
}

/**
 * Re-assigns reviewers whose assigned text belongs to a deactivated user.
 */
export async function reassignAfterDeactivation(
  userId: string
): Promise<number> {
  const affectedAssignments: AffectedAssignment[] = await prisma.reviewAssignment.findMany({
    where: {
      text: { authorId: userId },
      isActive: true,
      completed: false,
    },
    select: { id: true, assignmentId: true, reviewerId: true },
  });

  if (affectedAssignments.length === 0) return 0;

  await prisma.reviewAssignment.updateMany({
    where: {
      id: { in: affectedAssignments.map((a: AffectedAssignment) => a.id) },
    },
    data: { isActive: false },
  });

  let reassigned = 0;
  for (const assignment of affectedAssignments) {
    const newText = await findTextForAdditionalReview(
      assignment.assignmentId,
      assignment.reviewerId
    );
    if (newText) {
      await prisma.reviewAssignment.create({
        data: {
          assignmentId: assignment.assignmentId,
          textId: newText.id,
          reviewerId: assignment.reviewerId,
        },
      });
      reassigned++;
    }
  }

  return reassigned;
}
