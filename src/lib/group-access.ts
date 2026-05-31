import { prisma } from "./prisma";

/** Returns true if userId is either the group owner or a GroupTeacher member. */
export async function canAccessGroup(groupId: string, userId: string): Promise<boolean> {
  const count = await prisma.group.count({
    where: {
      id: groupId,
      OR: [
        { adminId: userId },
        { groupTeachers: { some: { userId } } },
      ],
    },
  });
  return count > 0;
}
